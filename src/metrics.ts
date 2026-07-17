// Metrics ([L26] / [O7]) — the audience-measuring primitive.
//
// V2 is deliberately audience-dependent (RICE couldn't score party mode: "can't
// see friend groups yet"), and the app shipped zero analytics, so we'd be building
// social features blind. This is the smallest thing that fixes that WITHOUT
// breaking the no-accounts promise:
//
//   - counters only, never event streams with content
//   - localStorage only, never leaves the device (an aggregate push is a later,
//     separate decision)
//   - no PII, no third-party SDK, no fingerprinting, no timestamps per event
//
// It counts HOW OFTEN things happen, never WHAT was said. Answers, questions and
// gallery content are never recorded here.

const KEY = 'meme_metrics';

/** The only things we count. Adding one is a deliberate act, not a reflex. */
export type MetricEvent =
  | 'question_shown'
  | 'answer_submitted'
  | 'question_skipped'
  | 'daily_completed'
  | 'vote_cast'
  | 'share_exported'
  | 'challenge_opened'
  | 'curate_opened';

export type Metrics = Partial<Record<MetricEvent, number>> & { firstSeen?: string };

function read(): Metrics {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Metrics) : {};
  } catch {
    return {};
  }
}

function write(m: Metrics): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable — metrics are best-effort, never load-bearing */
  }
}

/** Increment a counter. Silent and non-throwing by design. */
export function track(event: MetricEvent): void {
  const m = read();
  m[event] = (m[event] ?? 0) + 1;
  // A day-resolution first-seen lets us compute return-rate without per-event
  // timestamps (which would edge toward a behavioural log).
  if (!m.firstSeen) m.firstSeen = new Date().toISOString().slice(0, 10);
  write(m);
}

/** Read the counters (for the About page / debugging / a future aggregate push). */
export function getMetrics(): Metrics {
  return read();
}

/** Let a user wipe their own counters — part of the no-tracking promise. */
export function resetMetrics(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
