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
| 2 | Generator v2 + debug page | ⏳ |
| 3 | Core app (question card, tooltips, TTS, answers) | ⏳ |
| 4 | Share PNG (transcript card) | ⏳ |
| 5 | Daily Seed + gallery + resonance score | ⏳ |
| 6 | Curation flywheel (votes → seed promotion) | ⏳ |

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/meme-machine/
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

## Deploy

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds and publishes `dist/` to GitHub Pages. The repo's Pages source must be set
to **GitHub Actions**.

## Structure

```
meme-machine/
├── index.html                  # app shell
├── vite.config.ts              # base: '/meme-machine/'
├── src/
│   ├── main.ts                 # entry (Stage 0: placeholder + SW registration)
│   └── style.css               # design tokens + placeholder styles
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icon.svg                # app icon
│   └── sw.js                   # service worker (base-path aware, network-first shell)
├── data/                       # corpus source + compiled corpus_v3.json
├── scripts/build-corpus.mjs    # deterministic corpus compiler
├── specs/                      # normative design docs (00 plan, 01 schema, 02 generator)
└── .github/workflows/deploy.yml
```

## License

MIT — see [LICENSE](LICENSE).
