// About / legal / report page ([L22] / spec 03 §4 S8).
//
// Two reasons this page exists, and neither is decoration:
//   1. The share card travels without the app. A screenshot loses every bit of
//      framing that lived in the UI, so there has to be ONE stable, linkable place
//      that states the intent — and the on-pixel marker points at it.
//   2. If the app ever puts a name on a card, the person (or their estate, or
//      anyone who thinks a generated question resembles them) needs a way to
//      object. An app with no report path is just hoping.

import './style.css';
import './about.css';
import { getMetrics, resetMetrics } from './metrics';

const REPORT_URL = 'https://github.com/Chadjective/meme-machine/issues/new';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function section(title: string, ...body: (HTMLElement | string)[]): HTMLElement {
  const s = el('section', 'about-section');
  s.appendChild(el('h2', undefined, title));
  for (const b of body) {
    if (typeof b === 'string') s.appendChild(el('p', undefined, b));
    else s.appendChild(b);
  }
  return s;
}

function link(href: string, text: string): HTMLAnchorElement {
  const a = el('a', undefined, text);
  a.href = href;
  a.rel = 'noopener';
  return a;
}

function metricsBlock(): HTMLElement {
  const wrap = el('div', 'metrics');
  const m = getMetrics();
  const entries = Object.entries(m).filter(([k]) => k !== 'firstSeen') as [string, number][];

  if (entries.length === 0) {
    wrap.appendChild(el('p', 'muted', 'Nothing counted yet on this device.'));
  } else {
    const list = el('ul', 'metrics-list');
    for (const [k, v] of entries.sort((a, b) => b[1] - a[1])) {
      const li = el('li');
      li.append(el('span', 'm-k', k.replace(/_/g, ' ')), el('span', 'm-v', String(v)));
      list.appendChild(li);
    }
    wrap.appendChild(list);
    if (m.firstSeen) wrap.appendChild(el('p', 'muted', `First used on this device: ${m.firstSeen}`));
  }

  const clear = el('button', 'btn ghost small', 'Clear these counters');
  clear.type = 'button';
  clear.addEventListener('click', () => {
    resetMetrics();
    wrap.replaceChildren(el('p', 'muted', 'Cleared.'));
  });
  wrap.appendChild(clear);
  return wrap;
}

function main(): void {
  const root = document.querySelector<HTMLDivElement>('#about');
  if (!root) return;

  const wrap = el('div', 'about-wrap');

  const header = el('header', 'about-header');
  const home = link('./', '← Meme Machine');
  home.className = 'brand-link';
  header.appendChild(home);

  const h1 = el('h1', 'about-title', 'About this thing');
  const lede = el('p', 'lede', 'Meme Machine is satire. It generates absurd interview questions by colliding vocabulary from incompatible worlds — crypto, alchemy, corporate strategy, self-help — and then rates your answer with a percentage it made up.');

  wrap.append(header, h1, lede);

  wrap.appendChild(
    section(
      'Everything here is machine-generated and fake',
      'The questions are assembled by an algorithm from a word list. They are not real interview questions, not transcripts of anything that happened, and not advice. The "Semantic Resonance %" is not a measurement of anything — it is a joke about metrics that pretend to measure people.',
      'The images the app exports are labelled as AI-generated satire in the picture itself, because pictures travel and context does not.'
    )
  );

  wrap.appendChild(
    section(
      'No real people, no real companies',
      'The app does not put words in living people’s mouths and does not name real companies. Its vocabulary is deliberately limited to register words — "Byzantine", "Riemannian", "Hermetic" — which name a field or an era, not a person. This is enforced in the build: a word list containing a real name fails to compile.',
      'Where the app plays with historical figures, the target is always the modern habit of dressing management fashions up as ancient wisdom — never the person, the tradition, or anyone’s faith.'
    )
  );

  const privacy = section(
    'Privacy: there are no accounts and no tracking',
    'There is no sign-up, no login, and no analytics service. Your answers and your gallery are stored on your device and are never uploaded. If voting is switched on, a vote sends only the question, the machine’s own score, your vote, and a random ID that exists solely to stop one browser voting twice — never your answers, and never anything about you.',
    'The app keeps a few counters on this device so we can tell whether a feature is used at all. They count how often things happen, never what you wrote. They never leave this device, and you can wipe them right here:'
  );
  privacy.appendChild(metricsBlock());
  wrap.appendChild(privacy);

  const report = section(
    'Report something',
    'If something the machine produced resembles you, your company, or anyone real closely enough to be a problem — or is simply beyond the pale — say so and it will be removed and the word list fixed.'
  );
  const reportP = el('p');
  reportP.append('Open an issue: ', link(REPORT_URL, 'github.com/Chadjective/meme-machine/issues'), '.');
  report.appendChild(reportP);
  wrap.appendChild(report);

  const colophon = el('p', 'colophon');
  colophon.append(
    'Open source, MIT licensed — ',
    link('https://github.com/Chadjective/meme-machine', 'source on GitHub'),
    '. Every word in the app carries a real definition; that part is not a joke.'
  );
  wrap.appendChild(colophon);

  root.appendChild(wrap);
}

main();
