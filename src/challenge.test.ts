import { describe, expect, it } from 'vitest';
import {
  challengeUrl,
  encodeChallengeSeed,
  parseChallengeSeed,
  questionFromSeed,
} from './challenge';
import { corpus } from './lib/corpus';

describe('parseChallengeSeed — the S1 invariant', () => {
  it('accepts a bare base36 seed and round-trips it', () => {
    for (const seed of [0, 1, 42, 123456, 0x7fffffff, 0xffffffff]) {
      const encoded = encodeChallengeSeed(seed);
      expect(parseChallengeSeed(`?c=${encoded}`)).toBe(seed);
    }
  });

  it('returns null when there is no challenge param', () => {
    expect(parseChallengeSeed('')).toBeNull();
    expect(parseChallengeSeed('?other=1')).toBeNull();
  });

  // The whole point: a challenge link is a seed, never a payload. If any of these
  // ever parse, the growth loop has become a way to render attacker-chosen text
  // inside the branded app for a targeted recipient.
  it('rejects every free-text payload', () => {
    const attacks = [
      '?c=<script>alert(1)</script>',
      '?c=hello world',
      '?c=Tell me about your Goldman Sachs synergies',
      '?c=' + encodeURIComponent('<img src=x onerror=alert(1)>'),
      '?c=javascript:alert(1)',
      '?c=',
      '?c=%20',
      '?c=1.5',
      '?c=-1',
      '?c=ABC', // uppercase is outside the base36 alphabet we emit
      '?c=abc def',
      '?c=../../etc/passwd',
      '?c=data:text/html;base64,PHNjcmlwdD4=',
    ];
    for (const a of attacks) expect(parseChallengeSeed(a)).toBeNull();
  });

  it('rejects seeds outside uint32 even when they look base36', () => {
    expect(parseChallengeSeed('?c=1z141z4')).toBeNull(); // MAX_UINT32 + 1
    expect(parseChallengeSeed('?c=zzzzzzz')).toBeNull(); // 7 chars, way over
    expect(parseChallengeSeed('?c=zzzzzzzz')).toBeNull(); // 8 chars
  });

  it('reads only `c` — other params are never interpreted', () => {
    expect(parseChallengeSeed('?c=zz&name=<script>alert(1)</script>')).toBe(parseChallengeSeed('?c=zz'));
  });
});

describe('challengeUrl', () => {
  it('builds a seed-only link', () => {
    expect(challengeUrl(255, 'https://chadjective.github.io', '/meme-machine/')).toBe(
      'https://chadjective.github.io/meme-machine/?c=73'
    );
  });
});

describe('questionFromSeed — same seed, same question on any device', () => {
  it('is deterministic for a given seed', () => {
    for (const seed of [1, 99, 123456789, 0xffffffff]) {
      const a = questionFromSeed(corpus, seed);
      const b = questionFromSeed(corpus, seed); // a second "device"
      expect(a.text).toBe(b.text);
      expect(a.score).toBe(b.score);
      expect(a.text.length).toBeGreaterThan(0);
    }
  });

  it('gives different seeds different questions', () => {
    const texts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => questionFromSeed(corpus, s).text));
    expect(texts.size).toBeGreaterThan(1);
  });
});
