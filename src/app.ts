// App controller (old brief §App.jsx, as a vanilla module). Wires the Stage 2
// generator (free mode) to the question card + answer input, and the flow:
// open → question instantly → answer/skip → next.

import { corpus } from './lib/corpus';
import { createGenerator } from './lib/generator';
import { cryptoSeededRng } from './lib/rng';
import { formatResonance, resonance, verdict } from './lib/analytics';
import { incrementQuestionCount, saveAnswer } from './storage';
import { shareTranscript } from './share';
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

    // Compute the fake "Semantic Resonance" once per question (spec 02 §7) so the
    // share card is stable no matter how many times it's shared.
    const rng = cryptoSeededRng();
    const resonanceValue = resonance(current.score, rng);
    const resonanceText = formatResonance(resonanceValue);
    const verdictLine = verdict(resonanceValue, rng);
    const questionText = current.text;

    const frame = el('div', 'frame');
    frame.appendChild(renderQuestionCard(current));
    frame.appendChild(
      renderAnswerInput({
        onSubmit: (text) => {
          if (current && text.trim()) saveAnswer(current.text, text.trim());
          advance();
        },
        onSkip: advance,
        onShare: (text) => {
          void shareTranscript({ question: questionText, answer: text, resonanceText, verdictLine });
        },
      })
    );
    stage.replaceChildren(frame);
    requestAnimationFrame(() => frame.classList.add('in')); // fade the new question in
  };

  advance();
}
