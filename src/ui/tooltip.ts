// Vocabulary tooltip (old brief §VocabularyTooltip): word + definition + type +
// register + energy. Dismisses on outside tap or after 3 seconds. Single
// instance at a time.

import { el } from './dom';
import type { QuestionWord } from '../lib/types';

const TYPE_LABEL: Record<QuestionWord['type'], string> = {
  verb: 'VERB',
  modifier: 'MODIFIER',
  noun: 'NOUN',
};

let current: HTMLElement | null = null;
let hideTimer: number | undefined;
let outsideHandler: ((e: Event) => void) | null = null;

export function hideWordTooltip(): void {
  if (hideTimer !== undefined) {
    clearTimeout(hideTimer);
    hideTimer = undefined;
  }
  if (outsideHandler) {
    document.removeEventListener('pointerdown', outsideHandler, true);
    outsideHandler = null;
  }
  if (current) {
    current.remove();
    current = null;
  }
}

export function showWordTooltip(anchor: HTMLElement, word: QuestionWord): void {
  hideWordTooltip();

  const tip = el('div', `tooltip ${word.type}`);
  const head = el('div', 'tooltip-head');
  head.append(el('span', 'tooltip-word', word.word), el('span', 'tooltip-type', `${TYPE_LABEL[word.type]} · ${word.register}`));
  tip.append(head, el('div', 'tooltip-def', word.def));
  if (word.energy) tip.appendChild(el('div', 'tooltip-energy', word.energy));

  document.body.appendChild(tip);
  position(tip, anchor);
  current = tip;

  hideTimer = window.setTimeout(hideWordTooltip, 3000);

  // Register the outside-tap dismiss on the next tick so the opening tap doesn't
  // immediately close it.
  outsideHandler = (e) => {
    const target = e.target as Node;
    if (current && !current.contains(target) && target !== anchor && !anchor.contains(target)) hideWordTooltip();
  };
  setTimeout(() => {
    if (outsideHandler) document.addEventListener('pointerdown', outsideHandler, true);
  }, 0);
}

function position(tip: HTMLElement, anchor: HTMLElement): void {
  const r = anchor.getBoundingClientRect();
  tip.style.position = 'fixed';
  tip.style.left = '0';
  tip.style.top = '0';
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 8));
  let top = r.top - th - 10;
  if (top < 8) top = r.bottom + 10; // flip below the word if there's no room above
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
