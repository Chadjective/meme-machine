// Anonymous voting (Stage 6) — ported from Meme Streeps src/voting.ts.
//
// Two differences from the original, both forced by the fact that these questions
// are GENERATED rather than drawn from a fixed corpus:
//   1. The vote key is fnv1a(question text), not a quote id (per the master plan).
//   2. We store the question TEXT (plus template id and internal score) alongside
//      the hash — the database is the only record these questions ever existed, so
//      seed promotion needs the text, and the score gives us human-vs-machine
//      calibration data for the eventual matrix re-tune.
//
// Supabase is optional. With no env vars we run local-only, and the supabase chunk
// is never even fetched (the import below is gated on a build-time constant).

import { fnv1a } from './lib/rng';
import type { Question } from './lib/types';
import type { VoteDirection } from './swipe';

const DEVICE_KEY = 'meme_device_id';
const VOTES_KEY = 'meme_votes';

/** Build-time constant, so Rollup can drop the dynamic import entirely when unset. */
const SYNC_ENABLED = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const votesSyncEnabled = SYNC_ENABLED;

export interface VotePayload {
  question_hash: string;
  question_text: string;
  template_id: string;
  score: number;
  vote: VoteDirection;
  device_id: string;
}

// ── Pure helpers (unit-tested) ──────────────────────────────────────────────

/** Stable vote key: fnv1a of the question text, as 8 hex chars. */
export function questionVoteKey(text: string): string {
  return fnv1a(text).toString(16).padStart(8, '0');
}

export function buildVotePayload(
  question: Pick<Question, 'text' | 'templateId' | 'score'>,
  vote: VoteDirection,
  deviceId: string
): VotePayload {
  return {
    question_hash: questionVoteKey(question.text),
    question_text: question.text,
    template_id: question.templateId,
    score: Number(question.score.toFixed(4)),
    vote,
    device_id: deviceId,
  };
}

// ── Local state (guarded — private mode must not throw) ──────────────────────

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — degrade to in-memory for this session */
  }
}

function newDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => n.toString(16).padStart(8, '0')).join('-');
}

export function getDeviceId(): string {
  let id = read(DEVICE_KEY);
  if (!id) {
    id = newDeviceId();
    write(DEVICE_KEY, id);
  }
  return id;
}

function getVotes(): Record<string, VoteDirection> {
  const raw = read(VOTES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, VoteDirection>) : {};
  } catch {
    return {};
  }
}

/** Has this device already voted on this question? (instant, offline dedup) */
export function hasVoted(questionText: string): boolean {
  return questionVoteKey(questionText) in getVotes();
}

/** Records a vote. Returns false if this device already voted on the question. */
export function recordVote(
  question: Pick<Question, 'text' | 'templateId' | 'score'>,
  direction: VoteDirection
): boolean {
  const key = questionVoteKey(question.text);
  const votes = getVotes();
  if (key in votes) return false;

  votes[key] = direction;
  write(VOTES_KEY, JSON.stringify(votes));

  void syncVote(buildVotePayload(question, direction, getDeviceId()));
  return true;
}

/** Fire-and-forget insert. A unique-constraint hit (23505) just means "already voted". */
async function syncVote(payload: VotePayload): Promise<void> {
  if (!SYNC_ENABLED) return; // local-only: the supabase chunk is never loaded
  try {
    const { supabase } = await import('./supabase');
    const { error } = await supabase.from('votes').insert(payload);
    if (error && error.code !== '23505') {
      console.warn('[meme-machine] vote sync failed:', error.message);
    }
  } catch (err) {
    console.warn('[meme-machine] vote sync unavailable:', err);
  }
}

// ── Session counters ────────────────────────────────────────────────────────

let hiredCount = 0;
let onFileCount = 0;

export function incrementSession(direction: VoteDirection): void {
  if (direction === 'hired') hiredCount++;
  else onFileCount++;
}

export function getSessionCounts(): { hired: number; onFile: number } {
  return { hired: hiredCount, onFile: onFileCount };
}
