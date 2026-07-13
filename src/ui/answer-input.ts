// Answer input (old brief §AnswerInput): textarea + Submit + Skip, plus a mic
// button for voice input where the browser supports it.

import { el } from './dom';
import { startDictation, voiceInputSupported } from '../speech';

export interface AnswerInputHandlers {
  onSubmit: (text: string) => void;
  onSkip: () => void;
}

export function renderAnswerInput(handlers: AnswerInputHandlers): HTMLElement {
  const wrap = el('div', 'answer');

  const textarea = el('textarea', 'answer-text');
  textarea.placeholder = 'Your answer…';
  textarea.rows = 3;
  wrap.appendChild(textarea);

  const row = el('div', 'answer-row');

  const submit = el('button', 'btn primary', 'Submit');
  submit.type = 'button';
  submit.addEventListener('click', () => handlers.onSubmit(textarea.value));

  const skip = el('button', 'btn ghost', 'Skip');
  skip.type = 'button';
  skip.addEventListener('click', () => handlers.onSkip());

  row.append(submit, skip);

  if (voiceInputSupported()) {
    const mic = el('button', 'btn mic', '🎤');
    mic.type = 'button';
    mic.title = 'Voice input';
    mic.setAttribute('aria-label', 'Dictate your answer');
    let stop: (() => void) | null = null;
    mic.addEventListener('click', () => {
      if (stop) {
        stop();
        stop = null;
        mic.classList.remove('listening');
        return;
      }
      mic.classList.add('listening');
      const base = textarea.value ? `${textarea.value} ` : '';
      stop = startDictation(
        (text) => {
          textarea.value = base + text;
        },
        () => {
          mic.classList.remove('listening');
          stop = null;
        }
      );
    });
    row.appendChild(mic);
  }

  wrap.appendChild(row);

  // Enter submits (Shift+Enter = newline).
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlers.onSubmit(textarea.value);
    }
  });

  return wrap;
}
