// Curate screen (Stage 6) — the flywheel. Swipe a generated question right to
// hire it, left and we'll keep the résumé on file. Winners get promoted into the
// seed corpus by hand each week (see README).

import { el } from './dom';
import { initSwipe, type VoteDirection } from '../swipe';
import { getSessionCounts, votesSyncEnabled } from '../voting';
import type { Question, QuestionWord } from '../lib/types';

export interface CurateHandlers {
  /** Supplies the next generated, not-yet-voted question. */
  nextQuestion: () => Question;
  onVote: (question: Question, direction: VoteDirection) => void;
}

const EXIT_MS = 340; // must match the .exit-* transition in style.css

export function renderCurateView(handlers: CurateHandlers): HTMLElement {
  const wrap = el('div', 'curate');

  const hint = el('p', 'curate-hint', 'Swipe right to hire. Swipe left and we’ll keep the résumé on file.');
  const deck = el('div', 'deck');
  const tally = el('div', 'tally');

  const controls = el('div', 'curate-controls');
  const noButton = el('button', 'btn ghost vote-no', '✕ On file');
  const yesButton = el('button', 'btn vote-yes', '✓ Hired');
  noButton.type = 'button';
  yesButton.type = 'button';
  controls.append(noButton, yesButton);

  wrap.append(hint, deck, controls, tally);
  if (!votesSyncEnabled) {
    wrap.appendChild(el('p', 'curate-note', 'Votes are saved on this device only — Supabase isn’t configured yet.'));
  }

  let current: Question | null = null;
  let busy = false;

  function updateTally(): void {
    const { hired, onFile } = getSessionCounts();
    tally.replaceChildren(
      el('span', 'tally-yes', `Hired ${hired}`),
      el('span', 'tally-sep', '·'),
      el('span', 'tally-no', `On file ${onFile}`)
    );
  }

  function vote(direction: VoteDirection): void {
    if (busy || !current) return;
    busy = true;

    handlers.onVote(current, direction);
    updateTally();

    const card = deck.querySelector<HTMLElement>('.swipe-card');
    if (card) card.classList.add('voted', direction === 'hired' ? 'exit-right' : 'exit-left');

    window.setTimeout(() => {
      busy = false;
      deal();
    }, EXIT_MS);
  }

  function deal(): void {
    current = handlers.nextQuestion();
    const card = renderSwipeCard(current);
    initSwipe(card, { onVote: vote });
    deck.replaceChildren(card);
    requestAnimationFrame(() => card.classList.add('in'));
  }

  noButton.addEventListener('click', () => vote('resume_on_file'));
  yesButton.addEventListener('click', () => vote('hired'));

  updateTally();
  deal();
  return wrap;
}

function renderSwipeCard(question: Question): HTMLElement {
  const card = el('div', 'swipe-card');
  card.append(
    el('span', 'swipe-badge swipe-badge--left', 'On file'),
    el('span', 'swipe-badge swipe-badge--right', 'Hired')
  );

  const text = el('p', 'swipe-question');
  appendColoured(text, question.text, question.words);
  card.append(text, el('span', 'swipe-tpl', question.templateId));
  return card;
}

/** Colour-code the vocabulary. Not tappable here — a tap would fight the drag. */
function appendColoured(container: HTMLElement, text: string, words: QuestionWord[]): void {
  const placements = words
    .map((w) => ({ w, idx: text.indexOf(w.word) }))
    .filter((p) => p.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  let cursor = 0;
  for (const { w, idx } of placements) {
    if (idx < cursor) continue;
    if (idx > cursor) container.appendChild(document.createTextNode(text.slice(cursor, idx)));
    container.appendChild(el('span', `cword ${w.type}`, w.word));
    cursor = idx + w.word.length;
  }
  if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
}
