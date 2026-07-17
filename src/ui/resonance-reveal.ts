// Post-answer resonance reveal (spec 02 §7, shown after each answer). The fake
// "Semantic Resonance" percentage + a verdict, with Share and (in free play) Next.

import { el } from './dom';

export interface RevealOptions {
  resonanceText: string;
  verdictLine: string;
  onShare: () => void;
  onNext?: () => void; // omitted for Daily (one question per day)
  nextLabel?: string;
  onChallenge?: () => void; // "send a friend the same question"
  challengeLabel?: string;
  footnote?: string; // e.g. streak line, or "come back tomorrow"
}

export function renderResonanceReveal(opts: RevealOptions): HTMLElement {
  const wrap = el('div', 'reveal');
  wrap.append(
    el('div', 'reveal-label', 'SEMANTIC RESONANCE'),
    el('div', 'reveal-pct', opts.resonanceText),
    el('p', 'reveal-verdict', opts.verdictLine)
  );
  if (opts.footnote) wrap.appendChild(el('p', 'reveal-foot', opts.footnote));

  const row = el('div', 'reveal-row');
  const share = el('button', 'btn primary', '⤴ Share transcript');
  share.type = 'button';
  share.addEventListener('click', opts.onShare);
  row.appendChild(share);

  if (opts.onChallenge) {
    const challenge = el('button', 'btn ghost', opts.challengeLabel ?? '⚔ Challenge a friend');
    challenge.type = 'button';
    challenge.addEventListener('click', opts.onChallenge);
    row.appendChild(challenge);
  }

  if (opts.onNext) {
    const next = el('button', 'btn ghost', opts.nextLabel ?? 'Next question');
    next.type = 'button';
    next.addEventListener('click', opts.onNext);
    row.appendChild(next);
  }
  wrap.appendChild(row);

  requestAnimationFrame(() => wrap.classList.add('in'));
  return wrap;
}
