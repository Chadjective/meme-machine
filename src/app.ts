// App controller (old brief §App.jsx, as a vanilla module). Wires the Stage 2
// generator (free mode) to the question card + answer input, and the flow:
// open → question instantly → answer/skip → next.

import { corpus } from './lib/corpus';
import { createGenerator } from './lib/generator';
import { incrementQuestionCount, saveAnswer } from './storage';
import { cancelSpeech } from './tts';
import { el } from './ui/dom';
import { renderHeader } from './ui/header';
import { renderQuestionCard } from './ui/question-card';
import { renderAnswerInput } from './ui/answer-input';
import { hideWordTooltip } from './ui/tooltip';
import type { Question } from './lib/types';

export function initApp(): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) return;
  root.replaceChildren();

  const generator = createGenerator(corpus, { mode: 'free' });
  const header = renderHeader();
  const main = el('main', 'app-main');
  const stage = el('div', 'stage');
  main.appendChild(stage);
  root.append(header.root, main);

  let current: Question | null = null;

  const advance = (): void => {
    cancelSpeech();
    hideWordTooltip();
    current = generator.next();
    header.setCount(incrementQuestionCount());

    const frame = el('div', 'frame');
    frame.appendChild(renderQuestionCard(current));
    frame.appendChild(
      renderAnswerInput({
        onSubmit: (text) => {
          if (current && text.trim()) saveAnswer(current.text, text.trim());
          advance();
        },
        onSkip: advance,
      })
    );
    stage.replaceChildren(frame);
    requestAnimationFrame(() => frame.classList.add('in')); // fade the new question in
  };

  advance();
}
