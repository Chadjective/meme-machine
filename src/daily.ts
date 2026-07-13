// Daily Seed (Stage 5, spec 02 §6). The generator's daily mode is date-seeded, so
// the question is identical worldwide for a given date. Resonance + verdict are
// derived from a separate date-seeded rng so those are deterministic too.

import { createGenerator } from './lib/generator';
import { dailyRng } from './lib/rng';
import { formatResonance, resonance, verdict } from './lib/analytics';
import type { Corpus, Question } from './lib/types';

// Launch date — "DAILY RESONANCE №1" is this day. Numbering counts up from here.
const LAUNCH = '2026-07-13';
const DAY_MS = 86400000;

/** Local calendar date as YYYY-MM-DD (what the user calls "today"). */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailyNumber(dateISO: string): number {
  const ms = Date.parse(`${dateISO}T00:00:00`) - Date.parse(`${LAUNCH}T00:00:00`);
  return Math.max(1, Math.floor(ms / DAY_MS) + 1);
}

export interface DailyPack {
  date: string;
  number: number;
  question: Question;
  resonanceValue: number;
  resonanceText: string;
  verdictLine: string;
}

/** Today's (or any date's) deterministic daily question + resonance verdict. */
export function getDaily(corpus: Corpus, dateISO: string): DailyPack {
  const generator = createGenerator(corpus, { mode: 'daily', date: dateISO, storage: null });
  const question = generator.next();
  const rr = dailyRng(`${dateISO}#resonance`);
  const value = resonance(question.score, rr);
  return {
    date: dateISO,
    number: dailyNumber(dateISO),
    question,
    resonanceValue: value,
    resonanceText: formatResonance(value),
    verdictLine: verdict(value, rr),
  };
}

// ── Completion + streak persistence ──────────────────────────────────────────

export interface DailyResult {
  date: string;
  answer: string;
  resonanceText: string;
  verdictLine: string;
}

const DAILY_KEY = 'meme_daily';
const STREAK_KEY = 'meme_streak';

export function getSavedDaily(): DailyResult | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

export function saveDaily(result: DailyResult): void {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

export interface Streak {
  count: number;
  lastDate: string | null;
}

export function getStreak(): Streak {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Streak>;
      return { count: parsed.count ?? 0, lastDate: parsed.lastDate ?? null };
    }
  } catch {
    /* ignore */
  }
  return { count: 0, lastDate: null };
}

/** Record a completed daily for `dateISO`; increments the streak if consecutive. */
export function recordStreak(dateISO: string): Streak {
  const current = getStreak();
  if (current.lastDate === dateISO) return current; // already counted today
  const yesterday = todayISO(new Date(Date.parse(`${dateISO}T00:00:00`) - DAY_MS));
  const next: Streak =
    current.lastDate === yesterday ? { count: current.count + 1, lastDate: dateISO } : { count: 1, lastDate: dateISO };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
