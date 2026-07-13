// Scoring (spec 02 §2–4). score = collision × rhythm × form — a PRODUCT, so one
// weak factor kills the candidate. Plus the binary validity gates.

import type { Family } from './types';

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

// ── Collision matrix (spec 02 §2) ────────────────────────────────────────────
// Symmetric; "comedic potential of crossing these families". indigenous is
// excluded from the random pool, so it never reaches the matrix.

type MatrixFamily = Exclude<Family, 'indigenous'>;

const M: Record<MatrixFamily, Record<MatrixFamily, number>> = {
  tech:          { tech: 0.15, corporate: 0.70, science: 0.60, cosmic: 0.80, mystic: 1.0, psyche: 0.95, meaning: 0.80, internet: 0.70, contemplative: 0.85 },
  corporate:     { tech: 0.70, corporate: 0.15, science: 0.90, cosmic: 0.85, mystic: 1.0, psyche: 0.70, meaning: 0.80, internet: 0.50, contemplative: 0.80 },
  science:       { tech: 0.60, corporate: 0.90, science: 0.15, cosmic: 0.30, mystic: 0.90, psyche: 0.90, meaning: 0.70, internet: 0.80, contemplative: 0.85 },
  cosmic:        { tech: 0.80, corporate: 0.85, science: 0.30, cosmic: 0.15, mystic: 0.30, psyche: 0.70, meaning: 0.75, internet: 0.80, contemplative: 0.50 },
  mystic:        { tech: 1.0,  corporate: 1.0,  science: 0.90, cosmic: 0.30, mystic: 0.15, psyche: 0.50, meaning: 0.60, internet: 0.95, contemplative: 0.40 },
  psyche:        { tech: 0.95, corporate: 0.70, science: 0.90, cosmic: 0.70, mystic: 0.50, psyche: 0.15, meaning: 0.60, internet: 0.60, contemplative: 0.30 },
  meaning:       { tech: 0.80, corporate: 0.80, science: 0.70, cosmic: 0.75, mystic: 0.60, psyche: 0.60, meaning: 0.15, internet: 0.85, contemplative: 0.50 },
  internet:      { tech: 0.70, corporate: 0.50, science: 0.80, cosmic: 0.80, mystic: 0.95, psyche: 0.60, meaning: 0.85, internet: 0.15, contemplative: 0.85 },
  contemplative: { tech: 0.85, corporate: 0.80, science: 0.85, cosmic: 0.50, mystic: 0.40, psyche: 0.30, meaning: 0.50, internet: 0.85, contemplative: 0.15 },
};

export function matrixValue(a: Family, b: Family): number {
  if (a === 'indigenous' || b === 'indigenous') return 0;
  return M[a as MatrixFamily][b as MatrixFamily];
}

/** One modifier–noun pair, verb optional (spec 02 §2 formula). */
function pairCollision(fm: Family, fn: Family, fv?: Family): number {
  const mn = matrixValue(fm, fn);
  if (!fv) return mn; // verbless template: the modifier–noun phrase carries it
  return 0.6 * mn + 0.4 * Math.max(matrixValue(fv, fm), matrixValue(fv, fn));
}

export interface CollisionInput {
  verb?: Family;
  modifier: Family;
  noun: Family;
  modifier2?: Family; // present only for true two-pair templates (t19)
  noun2?: Family;
}

export function collision(inp: CollisionInput): number {
  const p1 = pairCollision(inp.modifier, inp.noun, inp.verb);
  if (inp.modifier2 && inp.noun2) {
    const p2 = pairCollision(inp.modifier2, inp.noun2, inp.verb);
    return (p1 + p2) / 2;
  }
  return p1;
}

// ── Rhythm (spec 02 §3) ──────────────────────────────────────────────────────

function firstAlpha(w: string): string {
  const m = w.toLowerCase().match(/[a-z]/);
  return m ? m[0] : '';
}
function last2Alpha(w: string): string {
  const a = w.toLowerCase().replace(/[^a-z]/g, '');
  return a.slice(-2);
}

/** Read-aloud quality from total syllables, with alliteration/echo adjustments. */
export function rhythm(totalSyllables: number, modifierWord: string, nounWord: string): number {
  let base: number;
  if (totalSyllables >= 15) base = 0.5;
  else if (totalSyllables >= 12) base = 0.8; // 12–14
  else if (totalSyllables <= 5) base = 0.8;
  else base = 1.0; // 6–11 (the read-aloud sweet spot)

  if (firstAlpha(modifierWord) && firstAlpha(modifierWord) === firstAlpha(nounWord)) base += 0.05; // alliteration
  if (last2Alpha(modifierWord).length === 2 && last2Alpha(modifierWord) === last2Alpha(nounWord)) base -= 0.1; // suffix echo

  return clamp(base, 0.4, 1.0);
}

// ── Form (spec 02 §3) ────────────────────────────────────────────────────────

const ALCHEMY_STAGES = new Set(['nigredo', 'albedo', 'citrinitas', 'rubedo']);

export function isAlchemyStage(word: string): boolean {
  return ALCHEMY_STAGES.has(word.toLowerCase());
}

/** ×0.3 per weak word; ×0.9 for an un-scaffolded alchemy-stage modifier. */
export function form(weakCount: number, alchemyStagePenalty: boolean): number {
  let f = Math.pow(0.3, weakCount);
  if (alchemyStagePenalty) f *= 0.9;
  return f;
}

export function score(collisionV: number, rhythmV: number, formV: number): number {
  return collisionV * rhythmV * formV;
}

// ── Validity gates (spec 02 §4) ──────────────────────────────────────────────

export interface FillWordMeta {
  lemma: string;
  family: Family;
}

/** Binary gate: base availability, no sensitive/indigenous, no shared lemma. */
export function validFill(words: FillWordMeta[], baseAvailable: boolean): { ok: boolean; reason?: string } {
  if (!baseAvailable) return { ok: false, reason: 'missing-base' };
  const seen = new Set<string>();
  for (const w of words) {
    if (w.family === 'indigenous') return { ok: false, reason: 'sensitive' };
    if (w.lemma.length >= 3) {
      if (seen.has(w.lemma)) return { ok: false, reason: 'lemma-dup' };
      seen.add(w.lemma);
    }
  }
  return { ok: true };
}
