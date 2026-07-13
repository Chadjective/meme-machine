# 02 — Generator v2 Design: Collision Matrix, Scoring, Slot Grammar

> Replaces the v1 algorithm (uniform random pick + naive string replace). The v1 brief
> said "prefer diversity" but never enforced it; this spec makes the comedy measurable.
> Design principle, stolen from the PUNSTAR 0.7 rule: **score is a product, not an
> average — one weak factor kills the candidate.** And its corollary: don't filter a
> single draw, *sample many and keep the best*.

## 0. Comedy model (why the numbers are what they are)

A collision is funny when it is **incongruous but parseable**. Two failure modes bound
the space:

- **Too coherent** → it's just a real phrase. "Heliocentric orbits" is astronomy.
  "Scalable solutions" is a real LinkedIn post. Nobody laughs at facts.
- **Too noisy** → it's word salad. If the reader can't construct *any* meaning, there's
  no joke, just static. (PUNSTAR: "if you can't reconstruct the source, there's no
  misquote, just a typo.")

The sweet spot is **sacred × profane**: one register that claims cosmic significance
(mystic, science) crossed with one that claims quarterly significance (corporate, tech,
internet). The reader's brain successfully parses the grammar, then fails to parse the
worldview. That gap is the laugh. The V1 MIXING GUIDE documented this empirically —
its named energies ("McKinsey physics", "CEO as oracle") are the calibration data for
the matrix below.

## 1. Question pipeline

```
generateQuestion(rng, opts):
  1. Seed or template?  P(seed) = 0.25, both via no-repeat shuffle bags (§5)
  2. If template: draw K = 12 candidate fills
  3. Score each candidate (§3), discard gate failures (§4)
  4. If best score < 0.45 → redraw up to 2 more rounds
  5. Pick uniformly among the top 3 candidates (argmax alone gets samey)
  6. Emit question object: text, words[] (word, def, energy, type, register),
     template id, score (kept internally — feeds the fake analytics, §7)
```

K=12 with ~535 words is microseconds. Never ship the raw first draw.

## 2. The collision matrix

Symmetric, values in [0, 1] = "comedic potential of crossing these families".
Calibrated against the V1 mixing guide (quotes in comments).

|              | tech | corp | sci  | cosmic | mystic | psyche | meaning | internet | contempl |
|--------------|------|------|------|--------|--------|--------|---------|----------|----------|
| **tech**     | .15  | .70  | .60  | .80    | **1.00** | .95  | .80     | .70      | .85      |
| **corp**     |      | .15  | .90  | .85    | **1.00** | .70  | .80     | .50      | .80      |
| **sci**      |      |      | .15  | .30    | .90    | .90    | .70     | .80      | .85      |
| **cosmic**   |      |      |      | .15    | .30    | .70    | .75     | .80      | .50      |
| **mystic**   |      |      |      |        | .15    | .50    | .60     | .95      | .40      |
| **psyche**   |      |      |      |        |        | .15    | .60     | .60      | .30      |
| **meaning**  |      |      |      |        |        |        | .15     | .85      | .50      |
| **internet** |      |      |      |        |        |        |         | .15      | .85      |
| **contempl** |      |      |      |        |        |        |         |          | .15      |

Calibration notes (the taste, written down):

- **tech×mystic = 1.00** — "Sacred economics" ("merkleized prophecies"). The flagship.
- **corp×mystic = 1.00** — "CEO as oracle" ("Delphic deliverables", "rubedo in
  quarterly planning"). Co-flagship.
- **corp×sci = .90** — "McKinsey physics" ("synergistic tensors").
- **mystic×internet = .95** — "Temporal whiplash" ("AI-generated prophecies").
- **tech×psyche = .95** — "manifesting Byzantine consensus", the best seed in the book.
- **sci×cosmic = .30, mystic×cosmic = .30** — the guide itself warns these are "actual
  astronomy" and "star wisdom": too coherent. Real sentences aren't jokes.
- **psyche×contempl = .30** — soft verb + self-help is just a wellness podcast.
- **corp×internet = .50** — "LinkedIn posts": dangerous near-miss zone. It's satire,
  but indistinguishable from the target — which is a *different game mode*
  (Real-or-Generated, V2), not the daily driver.
- **Diagonal = .15, not 0** — same-family isn't forbidden: "You gotta be optimizing
  homomorphic encryption" (pure tech) is a curated seed that works as "almost makes
  sense but doesn't". Rare, not extinct.
- **indigenous** — not in the matrix; excluded from the random pool (see 01 §5a).

**Combining three words.** The modifier–noun phrase carries the joke; the verb is the
delivery vehicle. For verb v, modifier m, noun n with families fv, fm, fn:

```
collision = 0.6 · M[fm][fn] + 0.4 · max(M[fv][fm], M[fv][fn])
```

Templates with a second pair ([MODIFIER2] [NOUN2]) score each pair and take the mean.

## 3. Scoring

```
score(candidate) = collision × rhythm × form          // product — one weak factor kills
```

**rhythm ∈ [0.4, 1.0]** — read-aloud quality, from stored syllable counts:

| total syllables (v+m+n) | value |
|---|---|
| 6–11 | 1.00 |
| 12–14 | 0.80 |
| ≤5 | 0.80 |
| ≥15 | 0.50 |

Adjustments: +0.05 if modifier and noun alliterate ("Pharaonic pipelines");
−0.10 if modifier and noun end in the same 2-char suffix ("-ic … -ic", "-al … -al" —
the echo reads as clunky, e.g. "topological astronomical"). Clamp to [0.4, 1.0].

**form ∈ (0, 1]** — ×0.3 per `weak:true` word in the fill (they're near-invisible out
of context); ×0.9 if the modifier is one of the noun-shaped alchemy stages (`nigredo`,
`albedo`, `citrinitas`, `rubedo`) in a template that doesn't scaffold them with "phase".

## 4. Validity gates (binary, checked before scoring)

1. **Slot grammar** — `[VERB:ger]` takes `entry.word`, `[VERB:base]` takes
   `entry.base`, `[NOUN:sing]` takes `entry.singular`. No naive string surgery.
2. **Lemma dedup** — no two words in one question share a base/stem
   (never "triggering triggered triggers").
3. **a/an** — if the template has "a [MODIFIER]", fix the article by vowel *sound*:
   `an` before vowel letters EXCEPT /ju/ words (`a unicorn`, `a Euclidean`… note
   "non-Euclidean" starts with n) and `a` before consonants EXCEPT silent-h (none in
   corpus). Small exception table beats a phonetics library.
4. **Case** — proper-noun capitals survive mid-sentence (Byzantine, Delphic, Hermetic
   stay capped — the capital letter is doing register work, same lesson as PUNSTAR's
   "always capitalize, it's a name"). Sentence-initial lowercase words get capped
   without touching the rest.
5. **Sensitive registers** — never drawn in random fills.
6. **[SECTOR]** pool: `governance, compliance, wellness, logistics, DeFi, HR,
   procurement, the creator economy, middle management, hospitality`.
   **[QUARTER]**: 1–4.

## 5. No-repeat shuffle bags (port of `images.ts` pattern from Meme Streeps)

One bag per pool: seeds, templates, verbs, modifiers, nouns. Draw = pop from a
shuffled copy; on exhaust, reshuffle with the constraint that the last 3 served items
don't appear in the next 3. Bags persist to localStorage so reloads don't reset
freshness. This kills the v1 brief's repetition bug (40% × 42 seeds = visible repeats
within ~20 questions; v3 uses P(seed)=0.25 over 62 seeds *and* a bag).

## 6. Seeded RNG (enables Daily Seed for free)

`mulberry32(fnv1a(dateString))` for daily mode — same question worldwide, no backend;
`crypto.getRandomValues`-seeded mulberry32 for free-play. All generator randomness goes
through the injected rng — **no bare `Math.random` anywhere in lib code** — so daily
mode, tests, and replays are deterministic. Shuffle bags in daily mode use their own
non-persistent bag seeded from the date.

## 7. Fake analytics — "Semantic Resonance" (written content, ship as-is)

Displayed score: `resonance = round(52 + 46 × S + jitter(±3))` where S is the internal
question score — so the machine's own comedy confidence leaks into the fake metric.
Format to one decimal ("87.3%"): fake precision IS the joke. Verdict line by band:

| band | verdict (rotate within band) |
|---|---|
| 95+ | "Full alignment. HR has been notified of your ascension." · "The ontologies accept you." |
| 85–94 | "Strong resonance. Your chakras are enterprise-grade." · "Leadership potential detected in your aura." |
| 70–84 | "Adequate. Your paradigms parse, but they do not yet sing." · "Mid-senior semantic energy." |
| 55–69 | "Partial resonance. Consider recalibrating your vibes pipeline." · "Your ontologies remain under-tessellated." |
| 40–54 | "Dissonance detected. Have you tried turning your worldview off and on again?" · "The Delphic committee is concerned." |
| <40 | "Semantic void. Please touch grass and reapply in Q3." · "Your résumé has been forwarded to the shadow realm." |

Swipe/vote labels (Stage 6): right = **"Hired"**, left = **"We'll keep your résumé on
file"**. Gallery empty state: "No transcripts yet. The interview begins when you do."

## 8. Proposed new seeds (Fable-written, pending Liam's approval — not yet in corpus)

Each with `whyItWorks`, per the schema rule. Under-served high-value cells of the matrix:

1. "Our Q3 retro will be held during Mercury retrograde, so come prepared to revisit literally everything." — *(astrology×corporate; the astrology is load-bearing AND procedurally accurate)*
2. "Are you comfortable being slashable?" — *(crypto×HR; the shortest possible threat disguised as a competency question)*
3. "Walk me through grounding an enshittified inner child." — *(psyche×internet; therapy-speak meets platform decay — the inner child was fine until the algorithm got to it)*
4. "The candidate should demonstrate 5+ years of prophetic debt amortization." — *(job-posting artifact; finance verb absorbs prophecy like it absorbs everything)*
5. "What is your five-year plan for the heat death of the universe?" — *(cosmic×corporate; the interview question that outlives the interviewer)*
6. "Describe a time you shipped during nigredo." — *(alchemy×startup; every founder has, they just called it 'the pivot')*
7. "We're looking for someone Delphic, but with strong communication skills." — *(mystic×HR; the job requirement that cancels itself)*
8. "How do you keep your epistemologies boundaries-respecting?" — *(meaning×psyche; asking a theory of knowledge to go to therapy)*
9. "Sources report vibes-based collateral detected in the Vedic sector." — *(news template exercising SECTOR slot with mystic payload)*
10. "In the end, we are all just percolating through hierarchies." — *(existential + org chart; true in both readings, which is the trick the 'strange attractors' seed taught us)*

## 9. Module contract (for the Stage 2 Opus session)

```
lib/generator.ts
  createGenerator(corpus, opts: { mode: 'free'|'daily', date?: string }) → {
    next(): Question, peekDaily(date): Question }
lib/scoring.ts     // matrix + score() + gates, pure functions, unit-tested
lib/grammar.ts     // slot fill, a/an, case, singular/base lookups, pure
lib/bags.ts        // shuffle bags + localStorage persistence
lib/rng.ts         // mulberry32 + fnv1a, injected everywhere
```

Acceptance: 100 daily-mode draws for a fixed date are identical across runs; 1,000
free-mode draws produce zero gate violations, zero lemma dupes, mean score ≥ 0.55; no
`Math.random` outside `rng.ts`.
