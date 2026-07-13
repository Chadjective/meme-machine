import './debug.css';
import { corpus } from './lib/corpus';
import { createGenerator } from './lib/generator';
import { resonance, formatResonance, verdict } from './lib/analytics';
import { cryptoSeededRng } from './lib/rng';
import type { Question, Register } from './lib/types';

const BATCH = 20;
const generator = createGenerator(corpus, { mode: 'free', storage: null });
const rng = cryptoSeededRng();

const countEntries = (section: Record<string, Register>): number =>
  Object.values(section).reduce((n, r) => n + r.entries.length, 0);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Render question text with each vocabulary word wrapped in a colored span. */
function renderText(text: string, words: Question['words']): DocumentFragment {
  const placements = words
    .map((w) => ({ w, idx: text.indexOf(w.word) }))
    .filter((p) => p.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  const frag = document.createDocumentFragment();
  let cursor = 0;
  for (const { w, idx } of placements) {
    if (idx < cursor) continue; // overlapping surface already covered
    if (idx > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, idx)));
    const span = el('span', `w ${w.type}`, w.word);
    span.title = w.energy ? `${w.def} — ${w.energy}` : w.def;
    frag.appendChild(span);
    cursor = idx + w.word.length;
  }
  if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
  return frag;
}

function factor(name: 'collision' | 'rhythm' | 'form', value: number): HTMLElement {
  const wrap = el('div', 'factor');
  const top = el('div', 'top');
  top.append(el('span', undefined, name), el('b', undefined, value.toFixed(2)));
  const track = el('div', 'track');
  const fill = el('div', `fill ${name}`);
  fill.style.width = `${Math.round(value * 100)}%`;
  track.appendChild(fill);
  wrap.append(top, track);
  return wrap;
}

function card(q: Question): HTMLElement {
  const c = el('div', 'card');

  const q1 = el('div', 'q');
  q1.appendChild(renderText(q.text, q.words));
  c.appendChild(q1);

  const meta = el('div', 'meta');
  if (q.isSeed) {
    meta.appendChild(el('span', 'tag seed', 'seed'));
    if (q.seedCategory) meta.appendChild(el('span', 'tag', q.seedCategory));
  } else {
    meta.appendChild(el('span', 'tag', q.templateId));
    if (q.mood) meta.appendChild(el('span', undefined, q.mood));
  }
  c.appendChild(meta);

  if (q.factors) {
    const grid = el('div', 'factors');
    grid.append(
      factor('collision', q.factors.collision),
      factor('rhythm', q.factors.rhythm),
      factor('form', q.factors.form)
    );
    c.appendChild(grid);
  }

  const value = resonance(q.score, rng);
  const readout = el('div', 'readout');
  const scoreLine = el('span', 'score');
  scoreLine.append(document.createTextNode('score '), el('b', undefined, q.isSeed ? 'curated' : q.score.toFixed(3)));
  const res = el('span', `resonance ${value >= 85 ? 'hi' : value >= 55 ? 'mid' : 'lo'}`, formatResonance(value));
  readout.append(scoreLine, res, el('span', 'verdict', verdict(value, rng)));
  c.appendChild(readout);

  return c;
}

function generate(list: HTMLElement, meanEl: HTMLElement): void {
  list.replaceChildren();
  const questions = Array.from({ length: BATCH }, () => generator.next());
  for (const q of questions) list.appendChild(card(q));
  const generated = questions.filter((q) => !q.isSeed);
  const mean = generated.reduce((s, q) => s + q.score, 0) / (generated.length || 1);
  meanEl.replaceChildren(
    document.createTextNode('batch mean (generated): '),
    el('b', undefined, mean.toFixed(3))
  );
}

function main(): void {
  const root = document.querySelector<HTMLDivElement>('#debug')!;
  const wrap = el('div', 'wrap');

  const header = el('header');
  header.append(
    el('h1', undefined, 'Meme Machine · Generator Debug'),
    el('p', 'sub', 'Stage 2 — sample many, keep the best. Hover a colored word for its definition.')
  );

  const toolbar = el('div', 'toolbar');
  const btn = el('button', undefined, `Generate ${BATCH}`);
  const stats = el('div', 'stats');
  stats.append(
    document.createTextNode('corpus: '),
    el('b', undefined, String(countEntries(corpus.verbs))),
    document.createTextNode(' verbs · '),
    el('b', undefined, String(countEntries(corpus.modifiers))),
    document.createTextNode(' modifiers · '),
    el('b', undefined, String(countEntries(corpus.nouns))),
    document.createTextNode(' nouns · '),
    el('b', undefined, String(corpus.seeds.length)),
    document.createTextNode(' seeds · '),
    el('b', undefined, String(corpus.templates.length)),
    document.createTextNode(' templates')
  );
  const mean = el('div', 'batch-mean');
  toolbar.append(btn, stats, mean);

  const list = el('div', 'list');
  wrap.append(header, toolbar, list);
  root.appendChild(wrap);

  btn.addEventListener('click', () => generate(list, mean));
  generate(list, mean);
}

main();
