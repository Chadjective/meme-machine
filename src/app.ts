// App controller (Stage 5). A small router over three screens — Play, Daily,
// Gallery — wired to the Stage 2 generator. Each answer reveals a fake "Semantic
// Resonance" verdict (spec 02 §7) and is saved to the gallery.

import { corpus } from './lib/corpus';
import { createGenerator } from './lib/generator';
import { cryptoSeededRng } from './lib/rng';
import { formatResonance, resonance, verdict } from './lib/analytics';
import { incrementQuestionCount, saveAnswer } from './storage';
import { addGalleryEntry } from './gallery';
import { getDaily, getSavedDaily, getStreak, recordStreak, saveDaily, todayISO } from './daily';
import { shareTranscript } from './share';
import { cancelSpeech } from './tts';
import { el } from './ui/dom';
import { renderNav, type Screen } from './ui/nav';
import { renderQuestionCard } from './ui/question-card';
import { renderAnswerInput } from './ui/answer-input';
import { renderResonanceReveal } from './ui/resonance-reveal';
import { renderGalleryView } from './ui/gallery-view';
import { hideWordTooltip } from './ui/tooltip';

export function initApp(): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) return;
  root.replaceChildren();

  const generator = createGenerator(corpus, { mode: 'free' });

  const header = el('header', 'app-header');
  let screen: Screen = 'play';
  const nav = renderNav(screen, (next) => go(next));
  header.append(el('div', 'brand', 'MEME MACHINE'), nav.root);

  const main = el('main', 'app-main');
  const stage = el('div', 'stage');
  main.appendChild(stage);
  root.append(header, main);

  function go(next: Screen): void {
    screen = next;
    nav.setActive(next);
    cancelSpeech();
    hideWordTooltip();
    if (next === 'play') renderPlay();
    else if (next === 'daily') renderDaily();
    else renderGallery();
  }

  function screenFrame(subLabel: string, streakCount?: number): { wrap: HTMLElement; sub: HTMLElement; frame: HTMLElement; slot: HTMLElement } {
    const wrap = el('div', 'screen');
    const sub = el('div', 'screen-sub');
    sub.appendChild(el('span', 'sub-label', subLabel));
    if (streakCount && streakCount > 0) sub.appendChild(el('span', 'sub-streak', `🔥 ${streakCount}`));
    const frame = el('div', 'frame');
    const slot = el('div', 'answer-slot');
    wrap.append(sub, frame);
    return { wrap, sub, frame, slot };
  }

  function mount(wrap: HTMLElement, frame: HTMLElement): void {
    stage.replaceChildren(wrap);
    requestAnimationFrame(() => frame.classList.add('in'));
  }

  // ── Play ────────────────────────────────────────────────────────────────
  function renderPlay(): void {
    const question = generator.next();
    const count = incrementQuestionCount();
    const rng = cryptoSeededRng();
    const value = resonance(question.score, rng);
    const resonanceText = formatResonance(value);
    const verdictLine = verdict(value, rng);

    const { wrap, frame, slot } = screenFrame(`Q #${count}`);
    frame.append(renderQuestionCard(question), slot);

    slot.appendChild(
      renderAnswerInput({
        onSubmit: (text) => {
          const answer = text.trim();
          if (!answer) {
            renderPlay(); // empty submit behaves like skip
            return;
          }
          saveAnswer(question.text, answer);
          addGalleryEntry({ question: question.text, answer, resonanceText, verdictLine, mode: 'free' });
          slot.replaceChildren(
            renderResonanceReveal({
              resonanceText,
              verdictLine,
              onShare: () => void shareTranscript({ question: question.text, answer, resonanceText, verdictLine }),
              onNext: () => renderPlay(),
              nextLabel: 'Next question',
            })
          );
        },
        onSkip: () => renderPlay(),
      })
    );

    mount(wrap, frame);
  }

  // ── Daily ───────────────────────────────────────────────────────────────
  function renderDaily(): void {
    const date = todayISO();
    const pack = getDaily(corpus, date);
    const saved = getSavedDaily();
    const alreadyDone = saved !== null && saved.date === date;

    const { wrap, sub, frame, slot } = screenFrame(`DAILY RESONANCE №${pack.number}`, getStreak().count);
    frame.append(renderQuestionCard(pack.question), slot);

    const shareDaily = (answer: string): void =>
      void shareTranscript({ question: pack.question.text, answer, resonanceText: pack.resonanceText, verdictLine: pack.verdictLine });

    if (alreadyDone) {
      const streak = getStreak();
      slot.appendChild(
        renderResonanceReveal({
          resonanceText: pack.resonanceText,
          verdictLine: pack.verdictLine,
          onShare: () => shareDaily(saved.answer),
          footnote: `Today's daily is done. Come back tomorrow.${streak.count > 1 ? ` · 🔥 ${streak.count}-day streak` : ''}`,
        })
      );
    } else {
      slot.appendChild(
        renderAnswerInput({
          onSubmit: (text) => {
            const answer = text.trim();
            if (!answer) return; // the daily needs an answer to complete
            saveAnswer(pack.question.text, answer);
            addGalleryEntry({ question: pack.question.text, answer, resonanceText: pack.resonanceText, verdictLine: pack.verdictLine, mode: 'daily' });
            saveDaily({ date, answer, resonanceText: pack.resonanceText, verdictLine: pack.verdictLine });
            const streak = recordStreak(date);
            sub.replaceChildren(el('span', 'sub-label', `DAILY RESONANCE №${pack.number}`), el('span', 'sub-streak', `🔥 ${streak.count}`));
            slot.replaceChildren(
              renderResonanceReveal({
                resonanceText: pack.resonanceText,
                verdictLine: pack.verdictLine,
                onShare: () => shareDaily(answer),
                footnote: `Daily complete. Come back tomorrow.${streak.count > 1 ? ` · 🔥 ${streak.count}-day streak` : ''}`,
              })
            );
          },
        })
      );
    }

    mount(wrap, frame);
  }

  // ── Gallery ─────────────────────────────────────────────────────────────
  function renderGallery(): void {
    const wrap = el('div', 'screen');
    wrap.appendChild(
      renderGalleryView({
        onShare: (entry) =>
          void shareTranscript({
            question: entry.question,
            answer: entry.answer,
            resonanceText: entry.resonanceText,
            verdictLine: entry.verdictLine,
          }),
      })
    );
    stage.replaceChildren(wrap);
  }

  go('play');
}
