# 00 — Meme Machine Master Plan

> Rebuild of the "semantic resonance generator". This directory is the future
> `chadjective/meme-machine` repo. Specs were authored by a Fable session
> (2026-07-07); implementation stages are sized for Opus sessions. Each stage brief
> below is self-contained: open a fresh Claude Code session in this directory, point
> it at the stage, go.

## What this app is

A satirical interview-question generator that collides vocabulary from incompatible
registers ("Are you comfortable intuiting non-Euclidean resonances?"). Player answers
deadpan, gets a fake-precise "Semantic Resonance %" score, and shares the Q+A as a
transcript-styled PNG. Tone: gently mocks tech interviews, self-help, and startup
culture. Secretly a vocabulary trainer — every word has a real tap-for-definition.

## Decisions already made (do not relitigate)

- **Vanilla TypeScript + Vite, no framework.** Overrides the old brief's React+Tailwind
  choice: every hard module ports from the Meme Streeps repo (vanilla TS) and this app
  class doesn't need a framework. Fonts/palette from the old brief stand (dark gradient
  `#0a0a0f→#1a1a2e→#0f0f1a`, coral `#e94560`, purple `#7b68ee` modifiers, cyan
  `#00d9ff` nouns, gold `#ffd700`; Crimson Pro + Space Mono).
- **Name:** Meme Machine. **Repo:** `chadjective/meme-machine`, GitHub Pages at
  `chadjective.github.io/meme-machine`, custom domain later.
- **V1 flow:** open → question on screen instantly → answer/skip → next. No onboarding.
- **Data:** `data/corpus_v3.json` compiled by `scripts/build-corpus.mjs`. Specs
  01 (schema) and 02 (generator) are normative.

## Stages

| # | Ships | Model | Spec |
|---|---|---|---|
| 0 | Repo scaffold + CI deploy + PWA shell | Opus | below |
| 1 | Corpus v3 | **done** (Fable) | 01 |
| 2 | Generator v2 + debug page | Opus (design done by Fable) | 02 |
| 3 | Core app (question card, tooltips, TTS, answers) | Opus | below |
| 4 | Share PNG (transcript/rejection-letter card) | Opus | below |
| 5 | Daily Seed + gallery + resonance score | Opus | below + 02 §6–7 |
| 6 | Curation flywheel (votes → seed promotion) | Opus | below |
| 7 | V2: party mode, personas, Real-or-Generated, misattribution | Fable for content, Opus for build | specced → 03 |

Milestones: **playable** after 3; **shareable** after 4. Never cut corpus quality (1),
generator quality (2), or the share card (4) — those three decide whether it's funny.

## The port map — steal from Meme Streeps (`C:\Users\LIAMJ\Desktop\Meme Streeps`)

| Steal | From | Adapt |
|---|---|---|
| Service worker (base-path aware) | `public/sw.js` | It was JUST fixed for `/meme-streeps/` paths (commits `f3dc9ee`, `93d1ce4`). Use the fixed pattern with `/meme-machine/`. Do NOT use the old brief's sw.js — it caches absolute `/` paths and 404s under a subpath. |
| Supabase client that survives missing env | `src/supabase.ts` | Commits `c9d9960` (no throw at module load) and `b426152` (stub recursion fix). Stage 6 only. |
| Swipe gesture discrimination | `src/swipe.ts` | Stage 6 voting. |
| Canvas PNG renderer (1080×1350) | `src/canvas-meme.ts` | Stage 4; replace meme layout with transcript layout. |
| Web Share wrapper | `src/share.ts` | Stage 4, as-is. |
| Gallery CRUD + view | `src/gallery.ts`, `src/gallery-view.ts` | Stage 5. |
| No-repeat random | `src/images.ts` | Stage 2 shuffle bags generalize this. |
| Anonymous device-id voting + dedup | `src/voting.ts`, `supabase/schema.sql` | Stage 6; vote target = question hash, not quote id. |
| Data build-script pattern | `scripts/build-quotes.mjs` | Already followed by `build-corpus.mjs`. |

## Stage briefs

### Stage 0 — Scaffold
`npm create vite@latest . -- --template vanilla-ts` in THIS directory (keep `data/`,
`scripts/`, `specs/`). `vite.config.ts` with `base: '/meme-machine/'`. GitHub Actions
deploy (old brief's workflow YAML is fine). PWA manifest (name Meme Machine, theme
`#e94560`, bg `#0a0a0f`) + ported SW. `.env.example` empty for now. Init git, create
`chadjective/meme-machine` public repo, Pages source = GitHub Actions.
**Done when:** placeholder page live at the URL, offline reload works, no console errors.

### Stage 2 — Generator
Implement spec 02 exactly: `lib/rng.ts`, `lib/bags.ts`, `lib/grammar.ts`,
`lib/scoring.ts`, `lib/generator.ts`, all pure/injected-rng, plus Vitest for the
acceptance criteria in 02 §9. Add `/debug.html` dev page: button → 20 scored
questions with per-factor breakdown (collision/rhythm/form) so Liam can eyeball the
comedy and re-tune the matrix.
**Done when:** acceptance tests green; debug page renders; Liam has reviewed one
20-question batch.

### Stage 3 — Core app
Old brief's component list, translated to vanilla TS modules: question card with
color-coded tappable words (definition + energy + register tooltip), TTS (`rate .85,
pitch .95` per old brief), answer textarea + skip, localStorage answers
(`meme_answers`), question counter. Wire to Stage 2 generator (free mode).
**Done when:** old brief's "Definition of Done" list passes on mobile; deployed.

### Stage 4 — Share card
Port `canvas-meme.ts` + `share.ts`. Layout: "INTERVIEW TRANSCRIPT — CONFIDENTIAL"
header, Q in Crimson Pro, A in Space Mono, resonance % stamp, footer
`meme-machine · chadjective.github.io/meme-machine`. 1080×1350 PNG via Web Share API
(download fallback).
**Done when:** phone share sheet delivers a correct PNG; desktop downloads.

### Stage 5 — Daily Seed, gallery, resonance
Daily mode per 02 §6 (date-seeded, same worldwide, "DAILY RESONANCE №N" numbered from
launch date), resonance score + verdicts per 02 §7 shown after each answer, gallery
port with per-entry share. Streak counter in localStorage.
**Done when:** two devices, same date → same daily question; gallery + share works.

### Stage 6 — Curation flywheel
Swipe on generated questions: right "Hired" / left "We'll keep your résumé on file".
Votes → Supabase (port voting/schema; vote key = fnv1a of question text). Weekly
manual promotion: top-voted generated questions get added to `vocabulary_v2.json`
seeds with `category: "community"` and rebuilt. (Automation later.)
**Done when:** votes land in Supabase from two devices, dedup holds, promotion
procedure documented in README.

## RICE receipts (from the planning session, pre-launch scales)

Generator hygiene (grammar slots 20.0, shuffle bags 20.0, corpus 10.0) > Daily Seed
11.2 > quality engine 8.0 = fake score 8.0 > PNG cards 7.2 (undercounts acquisition) >
artifact types 4.8 > everything social (≤2.0 until there's an audience — re-score at
V2). Cut TTS personas and collectible deck; party mode is the V2 flagship despite its
0.75 (RICE can't see friend groups yet).

## Model-split rationale

Opus executes every stage above — they're fully specced, and the specs are the
contract. Pull Fable back in for: matrix re-tuning after real usage, new seed/verdict
writing, the 326-word enrichment pass (01 §5e), party-mode design, persona voices.
Taste work, not typing work.
