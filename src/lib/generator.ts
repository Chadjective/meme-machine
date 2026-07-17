// The generator (spec 02 §1). Sample many, keep the best — never ship a raw
// first draw. All randomness flows through the injected rng.

import type { Corpus, PoolWord, Question, Register, Template, WordType } from './types';
import { cryptoSeededRng, dailyRng, pick, randInt, type Rng } from './rng';
import { ShuffleBag, type StorageLike } from './bags';
import { isRegisterDrawable } from './safety';
import { analyzeTemplate, lemmaKey, renderQuestion, type Fill, type TemplateShape } from './grammar';
import { collision, form, isAlchemyStage, rhythm, score, validFill, type FillWordMeta } from './scoring';

const SECTORS = [
  'governance', 'compliance', 'wellness', 'logistics', 'DeFi',
  'HR', 'procurement', 'the creator economy', 'middle management', 'hospitality',
] as const;

const P_SEED = 0.25; // P(seed) vs template (spec 02 §1)
const K = 12; // candidate fills per round
const REDRAW_THRESHOLD = 0.45;
const MAX_REDRAWS = 2;
const TOP_N = 3; // pick uniformly among the top N (argmax alone gets samey)

export interface GeneratorOptions {
  mode: 'free' | 'daily';
  date?: string;
  /** Inject an rng (tests / deterministic replays). Overrides mode's default. */
  rng?: Rng;
  /** Override storage for shuffle-bag persistence (free mode only). */
  storage?: StorageLike | null;
}

export interface Generator {
  next(): Question;
  peekDaily(date: string): Question;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function flatten(section: Record<string, Register>, type: WordType): PoolWord[] {
  const out: PoolWord[] = [];
  for (const [register, reg] of Object.entries(section)) {
    if (!isRegisterDrawable(reg)) continue; // the one safety gate — see lib/safety.ts
    for (const entry of reg.entries) out.push({ entry, register, family: reg.family, type });
  }
  return out;
}

const keyOf = (w: PoolWord): string => `${w.register}:${w.entry.word}`;

export function createGenerator(corpus: Corpus, opts: GeneratorOptions): Generator {
  const rng: Rng =
    opts.rng ?? (opts.mode === 'daily' ? dailyRng(opts.date ?? isoToday()) : cryptoSeededRng());

  // Daily bags are deterministic and non-persistent; free bags persist freshness.
  const persist = opts.mode === 'free';
  const bagOpts = (name: string) => ({
    rng,
    persistKey: persist ? `mm-bag-${name}` : null,
    storage: opts.storage,
  });

  const seedBag = new ShuffleBag(corpus.seeds, { key: (s) => s.text, ...bagOpts('seeds') });
  const templateBag = new ShuffleBag(corpus.templates, { key: (t) => t.id, ...bagOpts('templates') });
  const verbBag = new ShuffleBag(flatten(corpus.verbs, 'verb'), { key: keyOf, ...bagOpts('verbs') });
  const modifierBag = new ShuffleBag(flatten(corpus.modifiers, 'modifier'), { key: keyOf, ...bagOpts('modifiers') });
  const nounBag = new ShuffleBag(flatten(corpus.nouns, 'noun'), { key: keyOf, ...bagOpts('nouns') });

  function drawDistinct(bag: ShuffleBag<PoolWord>, excludeKey: string): PoolWord {
    let w = bag.draw();
    for (let i = 0; i < 8 && keyOf(w) === excludeKey; i++) w = bag.draw();
    return w;
  }

  function buildCandidate(template: Template, shape: TemplateShape): { q: Question; s: number } | null {
    const modifier = modifierBag.draw();
    const noun = nounBag.draw();
    const verb = shape.hasVerb ? verbBag.draw() : undefined;
    const modifier2 = shape.hasModifier2 ? drawDistinct(modifierBag, keyOf(modifier)) : undefined;
    const noun2 = shape.hasNoun2 ? drawDistinct(nounBag, keyOf(noun)) : undefined;

    const vocab: PoolWord[] = [];
    if (verb) vocab.push(verb);
    vocab.push(modifier, noun);
    if (modifier2) vocab.push(modifier2);
    if (noun2) vocab.push(noun2);

    // Gates (spec 02 §4): base availability + no sensitive + lemma dedup.
    const baseAvailable = shape.verbVariant !== 'base' || !!verb?.entry.base;
    const metas: FillWordMeta[] = vocab.map((w) => ({ lemma: lemmaKey(w), family: w.family }));
    if (!validFill(metas, baseAvailable).ok) return null;

    const fill: Fill = {
      verb,
      modifier,
      noun,
      modifier2,
      noun2,
      sector: shape.hasSector ? pick(rng, SECTORS) : undefined,
      quarter: shape.hasQuarter ? 1 + randInt(rng, 4) : undefined,
    };
    const rendered = renderQuestion(template, fill);

    // Score (spec 02 §2–3).
    const totalSyllables = vocab.reduce((n, w) => n + w.entry.syllables, 0);
    const rhythmV = rhythm(totalSyllables, modifier.entry.word, noun.entry.word);
    const weakCount = vocab.filter((w) => w.entry.weak).length;
    const alchemyPenalty = isAlchemyStage(modifier.entry.word) && !shape.phaseScaffolded;
    const formV = form(weakCount, alchemyPenalty);
    const collisionV = collision({
      verb: verb?.family,
      modifier: modifier.family,
      noun: noun.family,
      modifier2: modifier2?.family,
      noun2: noun2?.family,
    });
    const s = score(collisionV, rhythmV, formV);

    const q: Question = {
      text: rendered.text,
      words: rendered.words,
      templateId: template.id,
      score: s,
      factors: { collision: collisionV, rhythm: rhythmV, form: formV },
      isSeed: false,
      mood: template.mood,
    };
    return { q, s };
  }

  function seedQuestion(): Question {
    const seed = seedBag.draw();
    return {
      text: seed.text,
      words: [],
      templateId: 'seed',
      score: 1,
      factors: null,
      isSeed: true,
      seedCategory: seed.category,
    };
  }

  function templateQuestion(): Question {
    const template = templateBag.draw();
    const shape = analyzeTemplate(template);
    const candidates: { q: Question; s: number }[] = [];
    for (let round = 0; round <= MAX_REDRAWS; round++) {
      for (let i = 0; i < K; i++) {
        const c = buildCandidate(template, shape);
        if (c) candidates.push(c);
      }
      const best = candidates.reduce((mx, c) => Math.max(mx, c.s), 0);
      if (best >= REDRAW_THRESHOLD) break;
    }
    if (candidates.length === 0) return seedQuestion(); // guaranteed-valid fallback
    candidates.sort((a, b) => b.s - a.s);
    const top = candidates.slice(0, Math.min(TOP_N, candidates.length));
    return top[randInt(rng, top.length)].q;
  }

  function next(): Question {
    return rng() < P_SEED ? seedQuestion() : templateQuestion();
  }

  function peekDaily(date: string): Question {
    // A fresh, isolated daily generator so state can't leak between calls.
    return createGenerator(corpus, { mode: 'daily', date, rng: dailyRng(date), storage: null }).next();
  }

  return { next, peekDaily };
}
