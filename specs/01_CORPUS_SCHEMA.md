# 01 — Corpus v3 Schema & Curation Rules

> The single source of truth for Meme Machine vocabulary is `data/corpus_v3.json`,
> compiled by `scripts/build-corpus.mjs` from two inputs that are never edited by hand
> during a build: `data/vocabulary_v2.json` (the word/def database) and
> `data/enrichment_v1.json` (everything the v2 JSON export dropped from the original
> Excel database: energy tags, usage examples, affinity lists, the mixing guide,
> seed annotations, slot-annotated templates).
>
> Rule zero, inherited from the PUNSTAR engine: **data and engine must not drift.**
> Nothing edits `corpus_v3.json` directly. Change an input, re-run the build.

## 1. File inventory

| File | Role | Edited by |
|---|---|---|
| `data/vocabulary_v2.json` | Canonical words + definitions (v2.0, 2024-12-30) | Humans (add/remove words) |
| `data/enrichment_v1.json` | Recovered V1 columns + V1-only words + mixing guide | Humans (extend enrichment) |
| `scripts/build-corpus.mjs` | Join, derive, validate | Engineers |
| `data/corpus_v3.json` | Compiled output the app imports | **Nobody** (generated) |

## 2. Entry schema

Every vocabulary entry in `corpus_v3.json`:

```jsonc
{
  "word": "tessellating",
  "def": "Arranging in repeating geometric patterns",   // real definition — the secret curriculum
  "syllables": 4,            // derived; used by the rhythm scorer
  "energy": "Tiling, interlocking",                     // V1 ENERGY/FEEL (209 of 535 entries)
  "usage": "tessellating fractal governance",           // V1 EXAMPLE USAGE (verbs only)
  "pairsWellWith": ["consensus", "systems"],            // V1 affinity list (modifiers only)
  "base": "tessellate",      // verbs only — explicit map in build script, no naive stemming
  "singular": "ontology",    // nouns only — rules + override table
  "weak": true               // optional down-weight flag, see §4
}
```

Registers (subcategories) carry metadata:

```jsonc
"modifiers": {
  "astrology": {
    "family": "mystic",      // drives the collision matrix (02_GENERATOR_DESIGN.md §2)
    "sensitive": false,      // true = excluded from random collision pool, seeds only
    "entries": [ ... ]
  }
}
```

The ten families: `tech, corporate, science, cosmic, mystic, psyche, meaning,
internet, contemplative, indigenous`. Full register→family table lives in the build
script; treat it as spec.

## 3. Seeds and templates

- **Seeds** (62): hand-written questions that clear the quality bar by construction.
  30 carry `domains` + `whyItWorks` — the V1 comedy-theory annotations. Never delete
  the annotations; they're the training data for anyone (human or model) writing new
  seeds. New seeds should ship WITH a `whyItWorks`.
- **Templates** (32): the V1 slot-grammar set. Slots are typed — `[VERB:ger]`,
  `[VERB:base]`, `[NOUN]`, `[NOUN:sing]`, `[MODIFIER]`, `[MODIFIER2]`, `[NOUN2]`,
  `[SECTOR]`, `[QUARTER]` — because the naive v2 `[VERB]` fill produced broken
  grammar. Each template has a `mood` tag for future tonal filtering.

## 4. Curation rules (the 0.7-rule mindset, adapted)

A word earns its place by being **register-marked**: a stranger reading it cold should
be able to guess what world it comes from. "Merkleized" screams crypto; "Eleusinian"
screams mystery cult. That out-of-context signal is what makes a collision legible.

1. **Weak words are down-weighted, not deleted.** 31 words (e.g. `fit`, `direct`,
   `stable`, `lean`, `based`, `apex`, `fields`, `networks`) carry `weak: true` because
   out of context they read as plain English. The generator multiplies their selection
   weight by ~0.3. They stay in the corpus because they work in *seeds* where context
   does the lifting ("Are you a symbiotic or parasitic vendor partner?").
2. **Kill duplicates across part-of-speech quietly.** `signifying` exists as verb and
   `signified` as modifier — fine, different slots. But a generated question must never
   contain two forms of the same lemma ("triggering triggered triggers"). The generator
   enforces a per-question lemma-dedup (§02 spec, validity gates).
3. **Definitions are load-bearing.** Every word ships with its real definition — the
   tap-for-definition tooltip is the app's secret educational payload and the thing
   that separates this from a markov bot. A word with a lazy or wrong definition gets
   fixed or cut; never ship "def: TODO".
4. **New words need three things** (analog of PUNSTAR's form-table test): a register a
   stranger could name, a definition you'd defend, and at least one collision you can
   write down that makes you exhale through your nose. Can't produce all three → not in
   the corpus.

## 5. Flagged curation calls — need Liam's sign-off

**(a) The `indigenous` register — currently `sensitive: true`, seeds-only.**
The four indigenous seed phrases are the sharpest satire in the corpus, and they work
because their target is *corporate appropriation* ("Tell me about your experience with
quarterly reciprocity metrics" is punching at the consultant, not the tradition). Random
collision can't guarantee that punch direction — "growth-hacking two-spirit pipelines"
is a machine output nobody wants. Recommendation: keep the register, keep the four
seeds, exclude the words from the random pool. That's what the build currently does.
Alternatives: (1) delete the register entirely, (2) allow it and accept the risk. My
strong recommendation is the current state.

**(b) Zeitgeist slang shelf-life.** `bussin`, `slay`, `no-cap`, `mid`, `based` are
2022-flavored and aging fast; by launch they may read as "corporate trying to be
cool" — which is either dead-on satire or just dead. Recommendation: keep, but tag a
`vintage: 2022` field in a future pass so the UI can lean into it ("this word has been
deprecated by the youth").

**(c) Alchemy stage-names as modifiers.** `nigredo`, `albedo`, `citrinitas`, `rubedo`
are nouns wearing modifier costumes ("the nigredo phase" works; "nigredo pipelines" is
shakier). They stay because the seeds prove them ("achieving rubedo in quarterly
planning" is a hall-of-famer), but template fills treat them as higher-risk — the
scorer's rhythm/echo penalties usually handle it. No action needed, just awareness.

**(d) `symbioting → symbiote` base form.** "Symbioting" is an invented gerund; I mapped
its base to "symbiote" so "Those who symbiote…" parses as absurdist-correct. Flag if
you'd rather cut the word.

**(e) 326 entries have no energy tag** (only V1's 209 words were enriched). Nothing
breaks — energy is optional everywhere — but if the "vibe dial" feature (mood-coherent
generation) gets prioritized, the v2-only words need an enrichment pass. That pass is
good Fable work; do not hand it to autocomplete.

## 6. Growth path

The corpus is designed to absorb: new registers (drop a keyed array into
`vocabulary_v2.json`, add one line to the family map), new artifact-type templates
(job postings, rejection letters — same slot grammar), community-promoted seeds
(Stage 6 flywheel writes winners into `seedPhrases` with `category: "community"`),
and per-word popularity stats (future: vote-weighted selection).
