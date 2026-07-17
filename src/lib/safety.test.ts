import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script, shared with build-corpus.mjs so the corpus
// linter has exactly one definition.
import { lintProperNouns } from '../../scripts/lint-proper-nouns.mjs';
import { corpus } from './corpus';
import { createGenerator } from './generator';
import { isFamilyDrawable, isRegisterDrawable, SENSITIVE_FAMILIES } from './safety';
import type { Register } from './types';

const reg = (over: Partial<Register> = {}): Register => ({
  family: 'tech',
  sensitive: false,
  entries: [],
  ...over,
});

describe('the safety gate', () => {
  it('fences the indigenous family out of random collision', () => {
    expect(SENSITIVE_FAMILIES.has('indigenous')).toBe(true);
    expect(isFamilyDrawable('indigenous')).toBe(false);
    expect(isFamilyDrawable('tech')).toBe(true);
  });

  it('rejects a register that is sensitive OR of a fenced family', () => {
    expect(isRegisterDrawable(reg())).toBe(true);
    expect(isRegisterDrawable(reg({ sensitive: true }))).toBe(false);
    expect(isRegisterDrawable(reg({ family: 'indigenous' }))).toBe(false);
  });
});

describe('the invariant every mode inherits', () => {
  // The point of a single choke-point: no matter how a mode draws, a sensitive
  // word can never reach a generated question. Seeds are the sanctioned carve-out
  // and carry no words[], so scanning all words[] is the honest check.
  it('never emits a fenced word across 1500 generated questions', () => {
    const sensitiveRegisters = new Set<string>();
    for (const section of [corpus.verbs, corpus.modifiers, corpus.nouns]) {
      for (const [name, r] of Object.entries(section)) {
        if (!isRegisterDrawable(r)) sensitiveRegisters.add(name);
      }
    }
    expect(sensitiveRegisters.size).toBeGreaterThan(0); // the fence guards something

    const gen = createGenerator(corpus, { mode: 'free', storage: null });
    for (let i = 0; i < 1500; i++) {
      for (const w of gen.next().words) {
        expect(isFamilyDrawable(w.family)).toBe(true);
        expect(sensitiveRegisters.has(w.register)).toBe(false);
      }
    }
  });
});

describe('the shipped corpus', () => {
  it('contains no un-allowlisted real people, brands or products', () => {
    expect(lintProperNouns(corpus)).toEqual([]);
  });
});
