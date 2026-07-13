// No-repeat shuffle bags (spec 02 §5) — port of the images.ts pattern from Meme
// Streeps. Draw = pop from a shuffled copy; on exhaust, reshuffle with the
// constraint that the last-3 served items don't reappear in the next 3. Bags can
// persist to localStorage so reloads keep their freshness.

import { shuffle, randInt, type Rng } from './rng';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ShuffleBagOptions<T> {
  key: (item: T) => string; // stable identity for constraint + persistence
  rng: Rng;
  persistKey?: string | null; // localStorage key; null/undefined = no persistence
  storage?: StorageLike | null; // defaults to globalThis.localStorage when present
}

function defaultStorage(): StorageLike | null {
  const g = globalThis as { localStorage?: StorageLike };
  return g.localStorage ?? null;
}

export class ShuffleBag<T> {
  private items: T[];
  private byKey: Map<string, T>;
  private queue: string[] = []; // remaining keys; front = next to serve
  private recent: string[] = []; // last ≤3 served keys (oldest → newest)
  private keyOf: (item: T) => string;
  private rng: Rng;
  private persistKey: string | null;
  private storage: StorageLike | null;

  constructor(items: T[], opts: ShuffleBagOptions<T>) {
    this.items = items.slice();
    this.keyOf = opts.key;
    this.rng = opts.rng;
    this.persistKey = opts.persistKey ?? null;
    this.storage = opts.storage !== undefined ? opts.storage : defaultStorage();
    this.byKey = new Map(this.items.map((it) => [this.keyOf(it), it]));
    if (!this.restore()) this.reshuffle();
  }

  size(): number {
    return this.items.length;
  }

  draw(): T {
    if (this.queue.length === 0) this.reshuffle();
    const key = this.queue.shift()!;
    this.recent.push(key);
    if (this.recent.length > 3) this.recent.shift();
    this.persist();
    const item = this.byKey.get(key);
    if (item === undefined) {
      // Persisted key no longer exists (corpus changed) → rebuild and retry.
      this.reshuffle();
      return this.draw();
    }
    return item;
  }

  private reshuffle(): void {
    const keys = shuffle(
      this.rng,
      this.items.map((it) => this.keyOf(it))
    );
    // Keep any of the last-3 served out of the first 3 of the new order.
    if (this.recent.length > 0 && keys.length > 6) {
      const banned = new Set(this.recent);
      for (let attempt = 0; attempt < 20 && keys.slice(0, 3).some((k) => banned.has(k)); attempt++) {
        for (let i = 0; i < 3; i++) {
          if (banned.has(keys[i])) {
            const j = 3 + randInt(this.rng, keys.length - 3);
            const tmp = keys[i];
            keys[i] = keys[j];
            keys[j] = tmp;
          }
        }
      }
    }
    this.queue = keys;
    this.persist();
  }

  private persist(): void {
    if (!this.persistKey || !this.storage) return;
    try {
      this.storage.setItem(this.persistKey, JSON.stringify({ queue: this.queue, recent: this.recent }));
    } catch {
      /* storage unavailable/full — degrade silently to in-memory */
    }
  }

  private restore(): boolean {
    if (!this.persistKey || !this.storage) return false;
    try {
      const raw = this.storage.getItem(this.persistKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { queue?: unknown; recent?: unknown };
      const isStr = (k: unknown): k is string => typeof k === 'string';
      const queue = Array.isArray(parsed.queue) ? parsed.queue.filter(isStr).filter((k) => this.byKey.has(k)) : [];
      if (queue.length === 0) return false;
      this.queue = queue;
      this.recent = (Array.isArray(parsed.recent) ? parsed.recent.filter(isStr).filter((k) => this.byKey.has(k)) : []).slice(-3);
      return true;
    } catch {
      return false;
    }
  }
}
