# 03 — Stage 7 / V2 Scope & Open Questions

> The master plan left Stage 7 ("party mode, personas, Real-or-Generated,
> misattribution") deliberately unspecced — "Fable for content, Opus for build",
> "future". This document is the **spec-discovery**: it enumerates every open
> decision, routes each to its owner (**Liam** = product/scope/risk/business,
> **Fable** = content/taste/voice, **Opus** = pure build), fixes a safe default
> where one exists, and sequences the work.
>
> Authored by an Opus multi-agent pass (5 feature deep-dives → synthesis →
> adversarial safety critique). **Nothing here is built yet.** Liam answers the
> `[L#]` questions (and signs off the safety policy); Fable's `[F#]` questions get
> handed to a Fable session; Opus builds `[O#]` once the above are settled.

## 0. The one-paragraph shape

Treat Stage 7's MVP as a **V2 foundation, not a single feature**. Build the
governance + measurement foundation first, then ship the four features as lean,
**static, offline-first, no-backend** slices on top — each reusing the existing
generator, RNG/bags, scoring, resonance/verdicts, canvas share, question-card,
nav, and storage almost wholesale. The only genuinely new architecture is a
party round-state machine. Explicitly deferred behind gates: realtime rooms, any
LLM at runtime, any scraping, **any real person/company name**, and any UGC
promotion into the curated corpus.

## 1. Recommended sequencing (ascending cost + risk)

| # | Ships | Owner | Gate |
|---|---|---|---|
| 1 | **Governance + metrics foundation** — safety policy (§4), one enforcement choke-point + test, satire label baked into `canvas-card.ts`, localStorage-first no-PII metrics | Opus (policy: Liam) | — |
| 2 | **"Challenge a friend"** seeded-URL loop (reuses `mulberry32`/`fnv1a` + share PNG) | Opus | URL = **seed only**, no free-text (§4 S1) |
| 3 | **Real-or-Generated** (solo standalone screen) | Opus + Fable content | machine side = **pre-vetted frozen pool** (§4 S2) |
| 4 | **Personas** (verdict-only + cosmetic reskin; generator untouched) | Fable content + Opus | Daily stays persona-neutral |
| 5 | **Party mode** — pass-the-phone / async, fully offline | Opus + Fable content | preset handles, isolated artifacts |
| 6 | **Misattribution** — footer-only, fictional-persona bylines | Fable content + Opus | fictional-only; on-pixel parody marker |
| 7 | **Gated escalations** — realtime rooms; daily/telemetry fast-follows; any real-name / real-company path | — | explicit separate Liam (+counsel) decision |

Rationale: front-loads the cheap safety/measurement work that gates everything;
leads growth with the backend-free viral primitive that *measures* the audience
RICE can't yet see; validates V2 with the single-player mode that needs no
audience; ships the flagship (party) without backend risk; and puts the
highest-liability idea (misattribution) last and smallest.

---

## 2. Questions for LIAM

Grouped by theme. Each has options + a recommended default so you can mostly
**veto/adjust rather than compose**. The ★ ones are the highest-leverage.

### A. Scope & priority
- **[L1] ★ V2 build order?** — _Rec: the ascending cost/risk order in §1._ Alternatives: party-first (flagship-led, highest risk) or misattribution-first (highest legal risk).
- **[L2] ★ Ship Misattribution at all, or cut it?** — Its only unique value over the current share card is the byline gag; its worst case (fabricated quote from a real named person) is the highest-liability idea in V2. _Rec: ship the footer-only **fictional-persona** MVP; defer any real-name mode indefinitely behind a separate decision._
- **[L3] Real-or-Generated as its own nav screen ahead of party, or bundled with party?** — It's fully single-player, so it doesn't depend on party's audience question. _Rec: independent screen, shipped ahead of party._
- **[L4] How many personas at launch — 3 / 5 / 8?** — Sets Fable's authoring load and the thin-voice dilution risk. _Rec: **3** (enough contrast, each voice stays sharp)._

### B. Party mechanics
- **[L5] ★ Topology: pass-the-phone (one device) / live join-link room / async share-and-reply?** — THE flagship call; it decides whether a backend is forced, which cascades into the locked "no accounts, no auth, offline" constraints. _Rec: **pass-the-phone** MVP; live rooms are a gated fast-follow (§1 step 7)._
- **[L6] Winner selection: rotating judge / all-play vote / resonance-% auto-decides?** — _Rec: **rotating "Hiring Committee chair" judge** (no concurrent input on one phone); keep the fake % as per-answer garnish._
- **[L7] Prompt selection + round structure / win condition?** — _Rec: host taps generate+reroll; **best-of-5** with a localStorage scoreboard + champion screen. For any future link-room, seed the generator with the room code so joiners derive the identical prompt with zero server push._
- **[L8] (was mis-routed to Fable) Is the fake resonance % merely garnish, or the actual round-deciding score?** — This changes the interaction loop/win condition, so it's a mechanics call (the *framing* of the reveal stays Fable's). _Rec: **garnish**; the human vote decides._

### C. Persona mechanics
- **[L9] ★ Does a persona change the GENERATOR (bias families/templates) or ONLY framing + verdict copy?** — Decides whether personas are a cheap content pass or an engine change; gates Daily-determinism and comedy-quality risks. _Rec: **cosmetic/verdict-only** for MVP; a *soft* (never hard) family re-weight is a later fast-follow so the score gate still governs quality._
- **[L10] How does persona surface, does it appear on the card, and does it ever rewrite the question text?** — _Rec: session-level sticky picker on Play (localStorage, no new screen); one INTERVIEWER line + accent on the existing card; **question stays verbatim** (never mutate the generated string — it would fork the generator and break tap-for-definition)._
- **[L11] Does the resonance NUMBER change per persona, or only the wording?** — _Rec: **number unchanged** (keep the % honest to the comedy score S); revisit only if playtesters find it flat._

### D. Real-or-Generated mechanics
- **[L12] ★ Keep literal "REAL vs GENERATED", or reframe the axis?** — Calling a fabricated question "REAL" asserts a falsehood, and the corp×internet .50 zone is *deliberately* indistinguishable. _Rec: reframe to **"Human-written vs Machine-generated"** — keeps the whole game (spot the machine's tells) while it's literally true if Fable authors the human set._
- **[L13] Difficulty/scoring: flat accuracy / endless escalating streak / daily fixed-N shareable?** — _Rec: **endless escalating streak** for MVP; add a daily fixed-N shareable round later (reuses `daily.ts` + canvas share)._

### E. Safety & risk policy — the decisions that gate everything (§4 has the defaults)
- **[L14] ★★ Can a byline or persona EVER name a real person (living or dead) or a real company?** — The single highest-liability gate. _Rec: **fictional-only + no-name archetypes** for MVP; hard-cut all living people and all real companies; long-dead public-domain figures only as a possible V2.1 behind a **separate** greenlight (see L15). No "it's parody" or user-supplied framing reopens it._
- **[L15] (was mis-routed to Fable) If a dead-public-domain roster is ever greenlit, who owns the "recent/sensitive" exclusion rule and final sign-off?** — The line between an OK historical figure and an offense/defamation risk is a **risk-policy** judgment, not editorial taste. _Rec: Fable populates; **Liam (+counsel if invoked) owns the screening rule and final roster**._
- **[L16] Personas: generic archetypes only, or invented proper-name characters, or parody of recognizable real figures/companies?** — _Rec: **generic archetypes** (at most an invented non-referential nickname); forbid resemblance to any real person/company/logo/handle; defer the "LinkedIn Thought-Leader" persona (near-miss zone)._
- **[L17] Misattribution byline: on the QUESTION ("in the style/world of X"), on the user's ANSWER, or a full fabricated Q+A quote?** — _Rec: on the **machine-generated question only**, framed "in the style of"; never on the user's typed answer; never a verbatim first-person quote._
- **[L18] Is an on-pixel "parody / not a real quote" marker required baked into the share PNG (not just app chrome) whenever a byline is present?** — The PNG travels without the app; UI-only framing is lost on screenshot. _Rec: **yes**, bake it into the pixels; cheap insurance against context collapse._
- **[L19] Age assumption + any COPPA-style consideration, given party free-text answers become shareable branded PNGs?** — Undefined today; it sets the moderation/data baseline for all UGC features. _Rec: state a **13+ / not-for-children** assumption; keep all UGC ephemeral + local; no accounts._
- **[L20] Do party answers feed the gallery / Supabase seed-promotion flywheel, and do players use free-text names or preset handles?** — _Rec: **isolated** (local gallery save at most, never auto-promoted) + **preset persona handles** (kills the impersonation/slur/PII vector)._

### F. Governance & process
- **[L21] ★ Commission an audit of the SHIPPED 535-word corpus + 62 seeds for latent real proper nouns (people/brands/products/handles) before new modes amplify + screenshot them?** — The no-real-names invariant is only being applied to *new* content. _Rec: **yes** — audit now; add a proper-noun linter to `build-corpus.mjs` (Opus) so the invariant covers existing + future content at one choke-point._
- **[L22] ★ Add a standing About/legal disclaimer page + a contact/report/takedown path before Misattribution (and ideally any share-heavy mode) ships?** — Confirmed absent from all of `src/` today. A satire app emitting attributed travelling PNGs has no channel for a subject to object and no standing statement of intent. _Rec: **yes** — treat as a launch prerequisite for step 6, not a nicety._
- **[L23] Who authors + maintains the concrete blocklist/lexicon (forbidden real names, brands, sensitive tokens) the choke-point enforces?** — Enforcement is Opus; the *list* is editorial judgment. _Rec: **Fable authors, Liam signs off**; Opus wires it in with a test._
- **[L24] Can Personas and Misattribution bylines co-occur on the same artifact?** — _Rec: **at most one attribution source per artifact** (persona line XOR byline), both from curated fictional rosters; forbid stacking in the canvas render + test it._
- **[L25] Must the sensitive-register exclusion (indigenous = seeds-only, gate §4.5) hold as a HARD invariant across ALL new modes?** — _Rec: **yes** — one choke-point, one unit test, no per-mode exceptions._

### G. Audience, metrics & business
- **[L26] ★ Add minimal privacy-preserving instrumentation before V2 (we ship zero analytics today, so we'd build social features blind)?** — _Rec: **yes** — localStorage-first counters + optional anonymous aggregate events on the existing votes table; no PII, no third-party SDK._
- **[L27] ★ Per-feature success/kill threshold + observation window for each slice (challenge loop, R-or-G, personas, party)?** — Without pre-committed numbers the metrics can't actually govern invest/cut. _Rec: define a simple threshold per feature (e.g. "≥N challenge links opened/week and repeat use" gates realtime); Liam sets the numbers._
- **[L28] What evidence gate must pass before building **realtime** party rooms?** — _Rec: gate on **demonstrated repeat + shared usage** from the step-2 challenge loop._
- **[L29] Lead V2 growth with the seeded-URL challenge loop before any social feature?** — _Rec: **yes** — cheapest viral primitive, backend-free, zero safety surface (given L1/S1), and it measures the audience that gates everything heavier._
- **[L30] Any monetization in V2?** — _Rec: **none**; V2 is audience-building; payments force accounts/PII and clash with the anonymous model._

---

## 3. Questions for FABLE (content / taste / voice)

Hand these to a Fable session **after** Liam settles the policy gates above.

**Party**
- **[F1]** Party framing/lobby/onboarding copy ("Assemble your Hiring Committee") + lobby/empty/champion micro-copy, in the interview-satire register.
- **[F2]** The judge/vote deliberation beat + winner-announcement copy, extending the §7 resonance verdict bands for a group context.
- **[F3]** Decide whether party needs a curated **"party deck"** (punchier, answerable-aloud subset) and author it — out-loud comedy ≠ read-silently comedy.
- **[F4]** A preset **player persona-handle** list (safe, on-brand, funny) drawn from the app's own register vocabulary, replacing free-text names.

**Personas**
- **[F5]** Cast the 3 launch archetypes (e.g. Burned-Out Founder, Crypto Oracle, Wellness Consultant), each a one-line concept, under a strict "resembles no real person/company" constraint (Liam signs off the roster).
- **[F6]** Per-persona **6-band verdict tables** (~2 lines each), tonally rewritten from the shared bands, same thresholds; plus name, tagline, emoji/monogram, accent color, optional one-line intro/sign-off.
- **[F7]** A per-persona **voice bible + do-not-cross list** (no real-person resemblance, never mock the sacred itself, tone ceiling).

**Real-or-Generated**
- **[F8]** Author an **original** mundane/human question set (~50–80 boring-but-plausible interview + LinkedIn-cliché lines), **naming no real company/product/person**, each difficulty-tagged (easy / medium / near-miss). This is the register-calibration craft — especially the .50 near-miss band.
- **[F9]** Rule whether the 62 existing seeds may appear on the machine-plausible side, and confirm they're excluded from the human side.
- **[F10]** Name the mode + write the intro + per-outcome micro-copy (correct / incorrect / streak-milestone / game-over).

**Misattribution**
- **[F11]** Design a fictional persona **roster** (~20–40): name + title/role + register tag (corporate/mystic/…) for matching to a question's dominant collision families.
- **[F12]** Author the **hedge/attribution copy library** (6–10 rotating phrasings — "— X, probably", "allegedly", "from a since-deleted keynote") + the on-pixel "parody / not a real quote" micro-copy.
- **[F13]** _Conditional on an L14/L15 greenlight only:_ curate the long-dead public-domain whitelist with honest source notes (reusing the Meme Streeps PUNSTAR discipline). **Liam owns the sensitivity screen + final sign-off.**

**Cross-cutting content**
- **[F14]** Write the mandatory satire/disclaimer **label wording** (Liam sets that it's mandatory; Opus bakes it into `canvas-card.ts`).
- **[F15]** _Input to L-priority:_ advise whether personas/party "vibe" coherence needs the 326-word energy-tag enrichment (§5e) + vintage-2022 tagging (§5b) first, or can ship on the 209 tagged words. **Whether to gate the launch timeline on it is Liam's call.**

---

## 4. Safety policy & the safe defaults (Liam signs off as one policy)

These are the **defaults V2 ships with unless Liam overrides**. Six were surfaced
or hardened by the adversarial critique (marked ⚠ where they closed a real gap).

- **S1 ⚠ Challenge-URL = seed only.** The "challenge a friend" URL encodes ONLY a date/integer seed that deterministically regenerates a question via `mulberry32`/`fnv1a`. **No free-text payload** (no custom prompt, sender answer, or name) — otherwise it's an unmoderated channel to render attacker-chosen slurs/PII inside the branded app. Strict parse on load; reject non-seed payloads; unit-tested. _(Was mislabelled "zero safety surface" — it's only zero-risk once this is a coded invariant.)_
- **S2 ⚠ Real-or-Generated machine side = pre-vetted frozen pool.** Do NOT live-generate the machine cards (live gen can't be pre-screened, and the .50 near-miss cell can emit a plausibly-real *offensive/role-defamatory opinion* that word-level fencing won't catch). Batch-produce through the debug harness, human-screen, freeze into a data file; keep the .50 cell out unless each item is individually cleared.
- **S3 No real living people or companies, anywhere, in any mode.** Fictional archetypes / composite brands only ("Synergos Labs", "Ouroboros Capital"). The real-name path is presumptively unsafe; reconsidered only behind an explicit separate Liam (+counsel) decision (L14). No parody/user-framing reopens it.
- **S4 No user-supplied real names, ever.** No free-text name field, no real-name picker; any selection limited to Fable's curated fictional roster.
- **S5 On-pixel parody marker + hedge on every byline.** Baked into the 1080×1350 PNG (survives screenshot); content stays self-evidently absurd; never attribute anything a reader could plausibly believe was said.
- **S6 ⚠ One attribution per artifact.** Persona INTERVIEWER line XOR misattribution byline — never stacked into a compound fabricated attribution. Enforced in the canvas render + test.
- **S7 ⚠ Corpus audit + proper-noun linter.** Audit the shipped corpus + seeds for latent real names/brands; add a linter to `build-corpus.mjs` that fails the build on unapproved capitalized real-world names (covers existing + future at one choke-point).
- **S8 ⚠ About/legal + takedown page before share-heavy modes.** State satirical, AI-generated, no-real-people intent; provide a contact/report path; link the on-pixel marker's claim to it.
- **S9 Sensitive-register fence is a hard invariant.** Indigenous = seeds-only (gate §4.5) enforced at one pool/render choke-point + unit test; all modes inherit it.
- **S10 Exclude religious/sacred sources** from the misattribution roster regardless of public-domain status; personas satirize the corporate/tech *appropriation* of the mystical, never the mystical itself.
- **S11 ⚠ Party UGC stays local + labelled.** Party answers never auto-promote into the seed flywheel (coded invariant + test); minimise app branding on user-typed answer cards (or mandatory on-pixel "user-generated, unmoderated" label); treat the client-side profanity/PII soft-warn as UX nicety, not the control.
- **S12 No realtime / no LLM / no scraping / no server-side UGC in the MVP.** Defer realtime rooms (anonymous ephemeral RLS rooms, non-enumerable codes, host lock, rate-limit, no answer retention) behind the usage gate; personas are deterministic client-side transforms (no runtime LLM).

---

## 5. What OPUS builds once the above are settled

Pure build, no human judgment needed after the policy is set:

- **[O1]** Enforce no-real-names + sensitive-register exclusion at ONE pool/render choke-point (extend the §4.5 validity gate); one unit test every mode inherits. Add the proper-noun linter to `build-corpus.mjs`.
- **[O2]** Bake the mandatory satire/parody label into `canvas-card.ts`; enforce the one-attribution-per-artifact rule there.
- **[O3]** New V2 datasets as keyed input files compiled through `build-corpus.mjs` (`data/real_style_v1.json`, `data/attributions.json`) — never hand-edit `corpus_v3.json` (schema rule zero).
- **[O4]** Real-or-Generated: a generate-and-reject difficulty **batch** filter reading `factors.collision` + `words[].family` (no engine change) into the frozen vetted pool (S2); tap-for-definition suppressed until the guess locks, then revealed as the learning payoff.
- **[O5]** Daily determinism preserved: Daily generation stays persona/byline-neutral; any reskin seeds from the date via the existing `mulberry32(fnv1a(date))` path so every device matches.
- **[O6]** Party round-state machine + screens (the only genuinely new architecture); localStorage scoreboard; transcript-PNG restamp as the winner card.
- **[O7]** localStorage-first, no-PII metrics counters (+ optional anonymous aggregate events on the votes table).
- **[O8]** Seeded-URL challenge loop parser (S1): seed-only, strict-validated, unit-tested.

---

## 6. Readiness

The critique's verdict: **~85% ready** — the real-name/real-org/scraping paths are
correctly gated behind explicit Liam(+counsel) decisions with safe defaults, the
sensitive-register fence and mandatory disclaimer are named, and sequencing
front-loads governance. The gaps it closed (folded in above): the challenge-URL
seed-only constraint (S1), the R-or-G frozen-pool contradiction (S2), the three
Fable→Liam reroutes (L8, L15, and the enrichment-gate in F15), and the missing
questions (corpus audit L21, legal page L22, stacking L24, kill-thresholds L27,
age L19, blocklist owner L23). **This doc is now ready for Liam.**
