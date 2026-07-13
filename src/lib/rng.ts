// Seeded RNG (spec 02 §6). ALL generator randomness flows through an injected
// Rng — there is deliberately no `Math.random` anywhere in lib code, so daily
// mode, tests, and replays are deterministic.

export type Rng = () => number;

/** FNV-1a 32-bit hash of a string → unsigned 32-bit int. Seeds daily mode. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — small, fast, seedable. Returns a function yielding [0,1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Daily mode: same seed worldwide for a given date string (spec 02 §6). */
export function dailyRng(dateString: string): Rng {
  return mulberry32(fnv1a(dateString));
}

/** Free play: seed mulberry32 from crypto entropy (no reproducibility needed). */
export function cryptoSeededRng(): Rng {
  const buf = new Uint32Array(1);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(buf);
  } else {
    // Extremely defensive fallback (no crypto): derive a seed from the clock.
    buf[0] = (Date.now() ^ (Date.now() << 13)) >>> 0;
  }
  return mulberry32(buf[0]);
}

// ── Helpers built on an injected rng (the only randomness source) ────────────

export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}

/** In-place Fisher–Yates shuffle driven by the injected rng. Returns the array. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
