# Meme Machine

A satirical interview-question generator that collides vocabulary from incompatible
registers — _"Are you comfortable intuiting non-Euclidean resonances?"_ You answer
deadpan, get a fake-precise **Semantic Resonance %**, and share the exchange as a
transcript-styled PNG. It gently mocks tech interviews, self-help, and startup culture —
and secretly, every word is a real vocabulary card with a tap-for-definition.

Vanilla TypeScript + Vite, no framework. Deploys to GitHub Pages at
**[chadjective.github.io/meme-machine](https://chadjective.github.io/meme-machine)**.

## Status

Built in stages — see [`specs/00_MASTER_PLAN.md`](specs/00_MASTER_PLAN.md).

| Stage | Ships | State |
|---|---|---|
| 0 | Repo scaffold + CI deploy + PWA shell | ✅ |
| 1 | Corpus v3 (535 words, 62 seeds, 32 templates) | ✅ |
| 2 | Generator v2 + debug page | ✅ |
| 3 | Core app (question card, tooltips, TTS, answers) | ✅ |
| 4 | Share PNG (transcript card) | ✅ |
| 5 | Daily Seed + gallery + resonance score | ✅ |
| 6 | Curation flywheel (votes → seed promotion) | ✅ |

## Screens

- **Play** — a generated question. Tap any colour-coded word for its definition; ▶ Speak
  reads it aloud. Answer it and you get a fake **Semantic Resonance %** plus a verdict,
  then share the transcript or move on.
- **Daily** — one date-seeded question, identical for everyone that day
  ("DAILY RESONANCE №N"), with a streak.
- **Curate** — swipe generated questions: right = **Hired**, left = _we'll keep your
  résumé on file_. This feeds the flywheel below.
- **Gallery** — every transcript you've answered; re-share or delete.
- **[`/debug.html`](https://chadjective.github.io/meme-machine/debug.html)** — 20 scored
  questions with their per-factor breakdown (collision / rhythm / form), for tuning.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/meme-machine/
npm test           # Vitest: spec 02 §9 acceptance criteria + unit tests
```

## Build & preview

```bash
npm run build      # tsc typecheck + vite build → dist/
npm run preview    # serve the production build (this is where the service worker runs)
```

## Corpus

The word corpus is compiled from source data, never hand-edited:

```bash
npm run build:corpus   # data/{vocabulary_v2,enrichment_v1}.json → data/corpus_v3.json
```

Schema and curation rules live in [`specs/01_CORPUS_SCHEMA.md`](specs/01_CORPUS_SCHEMA.md);
generator design in [`specs/02_GENERATOR_DESIGN.md`](specs/02_GENERATOR_DESIGN.md).

## Voting & the curation flywheel

Vote sync is **optional**. With no Supabase credentials the app works exactly as normal and
keeps votes on the device only — the Supabase chunk is never even downloaded.

### Enabling vote sync

1. Create a free Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor. It creates the
   `votes` table (one vote per device per question), row-level security that allows
   anonymous insert/select, and a `leaderboard` view.
3. Locally, copy `.env.example` → `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

4. For deploys, add those same two as **repository secrets** (Settings → Secrets and
   variables → Actions) named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The deploy
   workflow passes them into the build.

The anon key is a publishable client key: it ships inside the JS bundle by design and is
protected by row-level security. Never use the service-role key here.

### Weekly promotion procedure

A generated question exists nowhere except the `votes` table, so that is where the good
ones are found.

1. Pull the winners in the Supabase SQL Editor:

   ```sql
   select question_text, hired, total_votes, approval_rate, avg_score
   from leaderboard
   where total_votes >= 5 and approval_rate >= 80
   order by approval_rate desc, total_votes desc
   limit 20;
   ```

2. Read them out loud. Keep only the ones that actually land — the bar is the 0.7 rule, not
   the vote count.
3. Append each keeper to `seedPhrases` in
   [`data/vocabulary_v2.json`](data/vocabulary_v2.json):

   ```json
   { "text": "Are you comfortable being slashable?", "category": "community" }
   ```

4. Rebuild and commit:

   ```bash
   npm run build:corpus
   git add data/ && git commit -m "Promote N community seeds"
   ```

Promoted questions ship as curated seeds on the next deploy. Automating this comes later —
for now the hand-pass _is_ the product: the human bar is what keeps the corpus funny.

`approval_rate` against the generator's own `avg_score` is also the calibration data for
re-tuning the collision matrix (spec 02 §2) once there's real usage.

## Deploy

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds and publishes `dist/` to GitHub Pages. The repo's Pages source must be set to
**GitHub Actions**.

## Structure

```
meme-machine/
├── index.html                  # app shell
├── debug.html                  # generator tuning page
├── vite.config.ts              # base: '/meme-machine/', multi-page
├── src/
│   ├── main.ts                 # entry + service-worker registration
│   ├── app.ts                  # router: play / daily / curate / gallery
│   ├── lib/                    # pure generator (spec 02): rng, bags, grammar,
│   │                           #   scoring, analytics, generator, corpus, types
│   ├── ui/                     # nav, question-card, tooltip, answer-input,
│   │                           #   resonance-reveal, curate-view, gallery-view
│   ├── canvas-card.ts          # 1080×1350 transcript PNG
│   ├── share.ts                # Web Share API + download fallback
│   ├── daily.ts                # date-seeded daily question + streak
│   ├── gallery.ts              # saved transcripts
│   ├── swipe.ts                # pointer-event swipe gesture
│   ├── voting.ts               # device id, dedup, fnv1a vote key
│   ├── supabase.ts             # client (no-op stub when unconfigured)
│   ├── storage.ts / tts.ts / speech.ts
│   └── style.css
├── public/                     # manifest.json, icon.svg, sw.js
├── data/                       # corpus source + compiled corpus_v3.json
├── scripts/build-corpus.mjs    # deterministic corpus compiler
├── supabase/schema.sql         # votes table + RLS + leaderboard view
├── specs/                      # normative design docs (00 plan, 01 schema, 02 generator)
└── .github/workflows/deploy.yml
```

## Privacy

No accounts, no tracking. A random device UUID lives in `localStorage` purely to stop one
browser voting twice on the same question. Your answers and gallery never leave the device.
Votes — only when Supabase is configured — carry just the question, the generator's own
score, the vote, and that UUID.

## License

MIT — see [LICENSE](LICENSE).
