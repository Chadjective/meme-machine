// "Challenge a friend" (spec 03 §1 step 2, §4 S1, [O8]).
//
// The loop: you get a seeded question, answer it, and send the seed. Your friend's
// device regenerates the IDENTICAL question from that seed alone — same trick as
// Daily mode, minus the date. No backend, no accounts, no stored round.
//
// THE constraint, and it is not negotiable (spec 03 §4 S1): the URL carries a
// PURE SEED and nothing else. The moment it can carry free text — a custom
// prompt, the sender's answer, a display name — this stops being a growth loop and
// becomes an unmoderated channel for rendering attacker-chosen content (slurs,
// harassment, PII) inside the branded app, aimed at a specific recipient. So the
// parser accepts base36 uint32 and rejects literally everything else.

import { mulberry32 } from './lib/rng';
import { createGenerator } from './lib/generator';
import { formatResonance, resonance, verdict } from './lib/analytics';
import type { Corpus, Question } from './lib/types';

/** base36 of a uint32 is at most 7 chars ('1z141z3' === 4294967295). */
const SEED_PATTERN = /^[0-9a-z]{1,7}$/;
const MAX_UINT32 = 0xffffffff;

/**
 * Strictly parse a challenge seed out of a query string. Returns null for
 * anything that isn't a bare base36 uint32 — including any free-text payload.
 */
export function parseChallengeSeed(search: string): number | null {
  let raw: string | null;
  try {
    raw = new URLSearchParams(search).get('c');
  } catch {
    return null;
  }
  if (raw === null) return null;
  if (!SEED_PATTERN.test(raw)) return null; // no free text, ever
  const n = Number.parseInt(raw, 36);
  if (!Number.isInteger(n) || n < 0 || n > MAX_UINT32) return null;
  return n >>> 0;
}

/** Serialise a seed for a URL. */
export function encodeChallengeSeed(seed: number): string {
  return (seed >>> 0).toString(36);
}

/** A fresh, unguessable seed. */
export function mintChallengeSeed(): number {
  const buf = new Uint32Array(1);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(buf);
  else buf[0] = (Date.now() ^ (Date.now() << 13)) >>> 0;
  return buf[0] >>> 0;
}

/** The absolute link to send. Seed-only by construction. */
export function challengeUrl(seed: number, origin: string, base: string): string {
  return `${origin}${base}?c=${encodeChallengeSeed(seed)}`;
}

/**
 * Regenerate a challenge question from its seed. Deterministic across devices:
 * the rng is seeded solely by the seed, and the bags are non-persistent, so no
 * local state can leak in (exactly how Daily stays identical worldwide).
 */
export function questionFromSeed(corpus: Corpus, seed: number): Question {
  return createGenerator(corpus, {
    mode: 'daily', // date-style determinism: injected rng + non-persistent bags
    rng: mulberry32(seed >>> 0),
    storage: null,
  }).next();
}

/**
 * The resonance for a challenge, derived from the seed.
 *
 * This has to be seeded too, not crypto-jittered: "beat my 87.3%" is meaningless
 * if the two devices roll different jitter on the same question. Uses a stream
 * distinct from the question's so the two derivations can't interfere.
 */
export function challengeResonance(
  question: Question,
  seed: number
): { resonanceText: string; verdictLine: string } {
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const value = resonance(question.score, rng);
  return { resonanceText: formatResonance(value), verdictLine: verdict(value, rng) };
}
