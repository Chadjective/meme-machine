// Question card (old brief §QuestionCard): the question dominates; each
// vocabulary word is tappable for its definition; a Speak button reads it aloud.

import { el } from './dom';
import { showWordTooltip } from './tooltip';
import { speak } from '../tts';
import type { Question } from '../lib/types';

export function renderQuestionCard(question: Question): HTMLElement {
  const card = el('article', 'card');

  const heading = el('h1', 'question');
  appendQuestionText(heading, question);
  card.appendChild(heading);

  const controls = el('div', 'card-controls');
  const speakBtn = el('button', 'speak-btn');
  speakBtn.type = 'button';
  speakBtn.append(el('span', 'speak-icon', '▶'), document.createTextNode(' Speak'));
  speakBtn.setAttribute('aria-label', 'Read the question aloud');
  speakBtn.addEventListener('click', () => {
    speakBtn.classList.add('speaking');
    speak(question.text, () => speakBtn.classList.remove('speaking'));
  });
  controls.appendChild(speakBtn);
  if (question.isSeed) controls.appendChild(el('span', 'seed-badge', 'curated'));
  card.appendChild(controls);

  return card;
}

/** Render the text with each vocabulary word as a tappable, color-coded button. */
function appendQuestionText(container: HTMLElement, question: Question): void {
  const { text, words } = question;
  const placements = words
    .map((w) => ({ w, idx: text.indexOf(w.word) }))
    .filter((p) => p.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  let cursor = 0;
  for (const { w, idx } of placements) {
    if (idx < cursor) continue; // overlapping surface already covered
    if (idx > cursor) container.appendChild(document.createTextNode(text.slice(cursor, idx)));
    const word = el('button', `word ${w.type}`, w.word);
    word.type = 'button';
    word.addEventListener('click', (e) => {
      e.stopPropagation();
      showWordTooltip(word, w);
    });
    container.appendChild(word);
    cursor = idx + w.word.length;
  }
  if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
}
