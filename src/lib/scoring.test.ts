import { describe, it, expect } from 'vitest';
import { matrixValue, collision, rhythm, form, score, validFill, isAlchemyStage } from './scoring';
import type { FillWordMeta } from './scoring';
import type { Family } from './types';

const FAMILIES: Family[] = [
  'tech', 'corporate', 'science', 'cosmic', 'mystic', 'psyche', 'meaning', 'internet', 'contemplative',
];

describe('collision matrix', () => {
  it('is symmetric', () => {
    for (const a of FAMILIES) {
      for (const b of FAMILIES) {
        expect(matrixValue(a, b)).toBe(matrixValue(b, a));
      }
    }
  });

  it('encodes the flagship calibration values', () => {
    expect(matrixValue('tech', 'mystic')).toBe(1.0);
    expect(matrixValue('corporate', 'mystic')).toBe(1.0);
    expect(matrixValue('tech', 'psyche')).toBe(0.95);
    expect(matrixValue('science', 'cosmic')).toBe(0.3); // "actual astronomy" — too coherent
    expect(matrixValue('mystic', 'cosmic')).toBe(0.3);
    expect(matrixValue('tech', 'tech')).toBe(0.15); // diagonal
  });

  it('treats indigenous as out-of-pool (0)', () => {
    expect(matrixValue('indigenous', 'tech')).toBe(0);
  });
});

describe('collision()', () => {
  it('verbless = the modifier–noun matrix value', () => {
    expect(collision({ modifier: 'mystic', noun: 'tech' })).toBe(matrixValue('mystic', 'tech'));
  });

  it('with a verb, blends 0.6·M[m][n] + 0.4·max(M[v][m], M[v][n])', () => {
    const v: Family = 'psyche', m: Family = 'tech', n: Family = 'mystic';
    const expected = 0.6 * matrixValue(m, n) + 0.4 * Math.max(matrixValue(v, m), matrixValue(v, n));
    expect(collision({ verb: v, modifier: m, noun: n })).toBeCloseTo(expected, 10);
  });

  it('two-pair templates average the two pairs', () => {
    const p1 = collision({ modifier: 'tech', noun: 'mystic' });
    const p2 = collision({ modifier: 'corporate', noun: 'cosmic' });
    expect(collision({ modifier: 'tech', noun: 'mystic', modifier2: 'corporate', noun2: 'cosmic' })).toBeCloseTo((p1 + p2) / 2, 10);
  });

  it('a lone noun2 (no modifier2) is not treated as a second pair', () => {
    expect(collision({ verb: 'tech', modifier: 'mystic', noun: 'tech', noun2: 'internet' })).toBe(
      collision({ verb: 'tech', modifier: 'mystic', noun: 'tech' })
    );
  });
});

describe('rhythm()', () => {
  it('bands by total syllables', () => {
    expect(rhythm(8, 'x', 'y')).toBe(1.0); // 6–11 sweet spot
    expect(rhythm(13, 'x', 'y')).toBe(0.8); // 12–14
    expect(rhythm(4, 'x', 'y')).toBe(0.8); // ≤5
    expect(rhythm(20, 'x', 'y')).toBe(0.5); // ≥15
  });

  it('+0.05 for alliteration', () => {
    expect(rhythm(13, 'Pharaonic', 'pipelines')).toBeCloseTo(0.85, 10);
  });

  it('−0.10 for a shared 2-char suffix echo', () => {
    expect(rhythm(8, 'topological', 'astronomical')).toBeCloseTo(0.9, 10);
  });

  it('clamps to [0.4, 1.0]', () => {
    expect(rhythm(8, 'aa', 'ab')).toBeLessThanOrEqual(1.0); // alliteration can't exceed 1.0
  });
});

describe('form()', () => {
  it('×0.3 per weak word', () => {
    expect(form(0, false)).toBe(1);
    expect(form(1, false)).toBeCloseTo(0.3, 10);
    expect(form(2, false)).toBeCloseTo(0.09, 10);
  });
  it('×0.9 alchemy-stage penalty', () => {
    expect(form(0, true)).toBeCloseTo(0.9, 10);
  });
  it('flags alchemy stage names', () => {
    expect(isAlchemyStage('nigredo')).toBe(true);
    expect(isAlchemyStage('Byzantine')).toBe(false);
  });
});

describe('score()', () => {
  it('is a product — one weak factor kills it', () => {
    expect(score(1.0, 1.0, 1.0)).toBe(1.0);
    expect(score(1.0, 1.0, 0.3)).toBeCloseTo(0.3, 10); // one weak word tanks a perfect collision
    expect(score(0.15, 1.0, 1.0)).toBeCloseTo(0.15, 10); // same-family diagonal
  });
});

describe('validFill() gates', () => {
  const meta = (lemma: string, family: Family = 'tech'): FillWordMeta => ({ lemma, family });

  it('passes distinct lemmas', () => {
    expect(validFill([meta('optimize'), meta('ontology'), meta('byzantine')], true).ok).toBe(true);
  });
  it('rejects a shared lemma', () => {
    expect(validFill([meta('trigger'), meta('trigger', 'internet')], true).reason).toBe('lemma-dup');
  });
  it('rejects a missing verb base', () => {
    expect(validFill([meta('optimize')], false).reason).toBe('missing-base');
  });
  it('rejects indigenous family words', () => {
    expect(validFill([meta('reciprocity', 'indigenous')], true).reason).toBe('sensitive');
  });
});
