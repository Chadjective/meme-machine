// Fake analytics — "Semantic Resonance" (spec 02 §7). Written content, shipped
// as-is. The machine's own comedy confidence (internal score S) leaks into a
// fake-precise percentage; the extra decimal IS the joke.

import { clamp } from './scoring';
import type { Rng } from './rng';

/** resonance = 52 + 46·S + jitter(±3), clamped to a plausible band. */
export function resonance(S: number, rng: Rng): number {
  const jitter = rng() * 6 - 3;
  return clamp(52 + 46 * S + jitter, 0, 99.9);
}

/** One decimal place — fake precision is the point ("87.3%"). */
export function formatResonance(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface Band {
  min: number;
  lines: string[];
}

const BANDS: Band[] = [
  { min: 95, lines: ['Full alignment. HR has been notified of your ascension.', 'The ontologies accept you.'] },
  { min: 85, lines: ['Strong resonance. Your chakras are enterprise-grade.', 'Leadership potential detected in your aura.'] },
  { min: 70, lines: ['Adequate. Your paradigms parse, but they do not yet sing.', 'Mid-senior semantic energy.'] },
  { min: 55, lines: ['Partial resonance. Consider recalibrating your vibes pipeline.', 'Your ontologies remain under-tessellated.'] },
  { min: 40, lines: ['Dissonance detected. Have you tried turning your worldview off and on again?', 'The Delphic committee is concerned.'] },
  { min: 0, lines: ['Semantic void. Please touch grass and reapply in Q3.', 'Your résumé has been forwarded to the shadow realm.'] },
];

/** Verdict line for a displayed resonance value; rotates within the band. */
export function verdict(displayValue: number, rng: Rng): string {
  const band = BANDS.find((b) => displayValue >= b.min) ?? BANDS[BANDS.length - 1];
  return band.lines[Math.floor(rng() * band.lines.length)];
}

// Copy for later stages (kept beside the verdicts so the voice stays consistent).
export const LABELS = {
  swipeRight: 'Hired',
  swipeLeft: "We'll keep your résumé on file",
  galleryEmpty: 'No transcripts yet. The interview begins when you do.',
} as const;
