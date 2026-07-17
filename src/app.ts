// App controller. A small router over four screens — Play, Daily, Curate,
// Gallery — wired to the Stage 2 generator. Each answer reveals a fake "Semantic
// Resonance" verdict (spec 02 §7) and is saved to the gallery.

import { corpus } from './lib/corpus';
import { createGenerator } from './lib/generator';
import { cryptoSeededRng } from './lib/rng';
import { formatResonance, resonance, verdict } from './lib/analytics';
import { incrementQuestionCount, saveAnswer } from './storage';
import { track } from './metrics';
import { addGalleryEntry } from './gallery';
import { getDaily, getSavedDaily, getStreak, recordStreak, saveDaily, todayISO } from './daily';
import {
  challengeResonance,
  challengeUrl,
  mintChallengeSeed,
  parseChallengeSeed,
  questionFromSeed,
} from './challenge';
import { shareChallenge, shareTranscript } from './share';
import { cancelSpeech } from './tts';
import { hasVoted, incrementSession, recordVote } from './voting';
import { el } from './ui/dom';
import { renderNav, type Screen } from './ui/nav';
import { renderQuestionCard } from './ui/question-card';
import { renderAnswerInput } from './ui/answer-input';
import { renderResonanceReveal } from './ui/resonance-reveal';
import { renderCurateView } from './ui/curate-view';
import { renderGalleryView } from './ui/gallery-view';
import { hideWordTooltip } from './ui/tooltip';
import type { Question } from './lib/types';

export function initApp(): void {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) return;
  root.replaceChildren();

  const generator = createGenerator(corpus, { mode: 'free' });

  // A ?c=<seed> link drops you straight into that challenge. The seed is the only
  // thing we ever read out of the URL (spec 03 §4 S1).
  let challengeSeed: number | null = parseChallengeSeed(location.search);
  let challengeInvited = challengeSeed !== null;
  if (challengeInvited) track('challenge_opened');

  const header = el('header', 'app-header');
  let screen: Screen = challengeSeed !== null ? 'challenge' : 'play';
  const nav = renderNav(screen, (next) => go(next));
  // The About page is a standing statement of intent + a report path (spec 03 §4
  // S8) — the on-pixel satire marker points here, so it must stay reachable.
  const about = el('a', 'about-link', 'About');
  about.href = `${import.meta.env.BASE_URL}about.html`;
  header.append(el('div', 'brand', 'MEME MACHINE'), nav.root, about);

  const main = el('main', 'app-main');
  const stage = el('div', 'stage');
  main.appendChild(stage);
  root.append(header, main);

  function go(next: Screen): void {
    screen = next;
    nav.setActive(next);
    cancelSpeech();
    hideWordTooltip();
    // Leaving a challenge clears ?c= so a reload doesn't drag you back into it.
    if (next !== 'challenge' && location.search) {
      history.replaceState(null, '', import.meta.env.BASE_URL);
    }
    if (next === 'play') renderPlay();
    else if (next === 'daily') renderDaily();
    else if (next === 'curate') renderCurate();
    else if (next === 'challenge') renderChallenge(challengeSeed ?? mintChallengeSeed(), challengeInvited);
    else renderGallery();
  }

  /** Mint a fresh challenge and jump to it — the sender answers it too. */
  function startChallenge(): void {
    challengeSeed = mintChallengeSeed();
    challengeInvited = false;
    history.replaceState(null, '', challengeUrl(challengeSeed, location.origin, import.meta.env.BASE_URL));
    go('challenge');
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
    track('question_shown');
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
          track('answer_submitted');
          saveAnswer(question.text, answer);
          addGalleryEntry({ question: question.text, answer, resonanceText, verdictLine, mode: 'free' });
          slot.replaceChildren(
            renderResonanceReveal({
              resonanceText,
              verdictLine,
              onShare: () => void shareTranscript({ question: question.text, answer, resonanceText, verdictLine }),
              onChallenge: startChallenge,
              onNext: () => renderPlay(),
              nextLabel: 'Next question',
            })
          );
        },
        onSkip: () => {
          track('question_skipped');
          renderPlay();
        },
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
            track('daily_completed');
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

  // ── Challenge ───────────────────────────────────────────────────────────
  // Both sides derive the same question AND the same resonance from the seed, so
  // "beat my 87.3%" compares like with like. Nothing is stored server-side; the
  // link is the entire protocol.
  function renderChallenge(seed: number, invited: boolean): void {
    const question = questionFromSeed(corpus, seed);
    const { resonanceText, verdictLine } = challengeResonance(question, seed);
    const url = challengeUrl(seed, location.origin, import.meta.env.BASE_URL);

    const { wrap, frame, slot } = screenFrame(invited ? 'YOU’VE BEEN CHALLENGED' : 'CHALLENGE');
    frame.append(renderQuestionCard(question), slot);

    const sendButton = el('button', 'btn ghost', '⚔ Send this challenge');
    sendButton.type = 'button';
    const send = (): void => {
      track('challenge_sent');
      void shareChallenge(url, question.text).then((result) => {
        if (result === 'copied') sendButton.textContent = 'Link copied ✓';
        else if (result === 'failed') sendButton.textContent = 'Couldn’t share — copy the URL';
      });
    };
    sendButton.addEventListener('click', send);

    slot.appendChild(
      renderAnswerInput({
        onSubmit: (text) => {
          const answer = text.trim();
          if (!answer) return;
          track('answer_submitted');
          saveAnswer(question.text, answer);
          addGalleryEntry({ question: question.text, answer, resonanceText, verdictLine, mode: 'challenge' });
          slot.replaceChildren(
            renderResonanceReveal({
              resonanceText,
              verdictLine,
              onShare: () => void shareTranscript({ question: question.text, answer, resonanceText, verdictLine }),
              onChallenge: send,
              challengeLabel: '⚔ Send this challenge',
              onNext: () => go('play'),
              nextLabel: 'Free play',
              footnote: invited
                ? 'Everyone who opens this link gets this exact question.'
                : 'Send the link — they get this exact question, scored the same way.',
            })
          );
        },
      })
    );

    const sendRow = el('div', 'challenge-send');
    sendRow.appendChild(sendButton);
    wrap.appendChild(sendRow);

    mount(wrap, frame);
  }

  // ── Curate ──────────────────────────────────────────────────────────────
  // The flywheel only votes on GENERATED questions: seeds are already curated by
  // hand, and promotion writes the winners back into the seed list.
  function nextCurateQuestion(): Question {
    for (let i = 0; i < 40; i++) {
      const q = generator.next();
      if (!q.isSeed && !hasVoted(q.text)) return q;
    }
    // Everything drawn was a seed or already voted on — serve a generated one
    // anyway rather than spin.
    let q = generator.next();
    for (let i = 0; i < 20 && q.isSeed; i++) q = generator.next();
    return q;
  }

  function renderCurate(): void {
    const wrap = el('div', 'screen');
    wrap.appendChild(
      renderCurateView({
        nextQuestion: nextCurateQuestion,
        onVote: (question, direction) => {
          track('vote_cast');
          recordVote(question, direction);
          incrementSession(direction);
        },
      })
    );
    stage.replaceChildren(wrap);
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

  // Not go('play') — a ?c= link must land on its challenge, not the free feed.
  go(screen);
}
