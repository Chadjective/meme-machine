import { describe, it, expect } from 'vitest';
import { corpus } from './corpus';
import { createGenerator } from './generator';
import { mulberry32 } from './rng';
import { lemmaKey } from './grammar';
import { validFill, type FillWordMeta } from './scoring';
import type { Entry, Family, Register, WordType } from './types';

const POOL_FAMILIES = new Set<Family>([
  'tech', 'corporate', 'science', 'cosmic', 'mystic', 'psyche', 'meaning', 'internet', 'contemplative',
]);

// Index every surface form (word/base/singular) → its entry, so we can map a
// rendered QuestionWord back to the entry the generator used and re-check gates.
function buildSurfaceIndex(): Map<string, { entry: Entry; type: WordType }> {
  const idx = new Map<string, { entry: Entry; type: WordType }>();
  const add = (section: Record<string, Register>, type: WordType) => {
    for (const [register, reg] of Object.entries(section)) {
      if (reg.sensitive) continue;
      for (const entry of reg.entries) {
        for (const surface of [entry.word, entry.base, entry.singular]) {
          if (surface) idx.set(`${type}|${register}|${surface}`, { entry, type });
        }
      }
    }
  };
  add(corpus.verbs, 'verb');
  add(corpus.modifiers, 'modifier');
  add(corpus.nouns, 'noun');
  return idx;
}

describe('daily mode (spec 02 §9)', () => {
  it('100 draws for a fixed date are identical across runs', () => {
    const date = '2026-07-13';
    const run = () => {
      const g = createGenerator(corpus, { mode: 'daily', date });
      return Array.from({ length: 100 }, () => g.next().text);
    };
    expect(run()).toEqual(run());
  });

  it('peekDaily is deterministic and equals the first daily draw', () => {
    const date = '2026-11-30';
    const a = createGenerator(corpus, { mode: 'daily', date }).peekDaily(date);
    const b = createGenerator(corpus, { mode: 'daily', date }).peekDaily(date);
    expect(a).toEqual(b);
    const first = createGenerator(corpus, { mode: 'daily', date }).next();
    expect(a.text).toBe(first.text);
  });

  it('different dates generally differ', () => {
    const one = createGenerator(corpus, { mode: 'daily', date: '2026-01-01' }).peekDaily('2026-01-01');
    const two = createGenerator(corpus, { mode: 'daily', date: '2026-01-02' }).peekDaily('2026-01-02');
    expect(one.text).not.toBe(two.text);
  });
});

describe('free mode (spec 02 §9)', () => {
  it('1000 draws: zero gate violations, zero lemma dupes, mean generated score ≥ 0.55', () => {
    const g = createGenerator(corpus, { mode: 'free', rng: mulberry32(0xc0ffee), storage: null });
    const idx = buildSurfaceIndex();

    let sum = 0;
    let generated = 0;
    let gateViolations = 0;
    let lemmaDupes = 0;

    for (let i = 0; i < 1000; i++) {
      const q = g.next();
      if (q.isSeed) {
        expect(q.words).toEqual([]);
        continue;
      }
      generated++;
      sum += q.score;
      expect(q.score).toBeGreaterThan(0);
      expect(q.score).toBeLessThanOrEqual(1);

      const metas: FillWordMeta[] = q.words.map((w) => {
        expect(POOL_FAMILIES.has(w.family)).toBe(true);
        const rec = idx.get(`${w.type}|${w.register}|${w.word}`);
        expect(rec, `no entry for ${w.type}|${w.register}|${w.word}`).toBeTruthy();
        return { lemma: lemmaKey(rec!), family: w.family };
      });

      if (!validFill(metas, true).ok) gateViolations++;

      const seen = new Set<string>();
      for (const m of metas) {
        if (m.lemma.length >= 3) {
          if (seen.has(m.lemma)) lemmaDupes++;
          seen.add(m.lemma);
        }
      }
    }

    expect(generated).toBeGreaterThan(0);
    expect(gateViolations).toBe(0);
    expect(lemmaDupes).toBe(0);
    expect(sum / generated).toBeGreaterThanOrEqual(0.55);
  });

  it('roughly a quarter of draws are seeds (P_seed = 0.25)', () => {
    const g = createGenerator(corpus, { mode: 'free', rng: mulberry32(7), storage: null });
    let seeds = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) if (g.next().isSeed) seeds++;
    expect(seeds / N).toBeGreaterThan(0.18);
    expect(seeds / N).toBeLessThan(0.32);
  });
});
