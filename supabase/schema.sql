-- ═══════════════════════════════════════════════════════════════════════════
-- Meme Machine — Supabase schema (Stage 6: curation flywheel)
-- Run this in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Votes ──────────────────────────────────────────────────────────────────
-- Unlike Meme Streeps (which voted on quotes that already lived in the corpus),
-- these questions are GENERATED — this table is the only record they ever
-- existed. So we store the text itself (promotion needs it) plus the template and
-- the generator's internal score (human votes vs. machine score = the calibration
-- data for re-tuning the collision matrix).
CREATE TABLE IF NOT EXISTS votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash text NOT NULL,                -- fnv1a(question_text), 8 hex chars
  question_text text NOT NULL,
  template_id   text,
  score         numeric,                      -- generator's internal score S ∈ [0,1]
  vote          text NOT NULL CHECK (vote IN ('hired', 'resume_on_file')),
  device_id     text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- One vote per device per question. A unique INDEX (not a constraint) so the
-- script stays re-runnable.
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_device_question
  ON votes (question_hash, device_id);

CREATE INDEX IF NOT EXISTS idx_votes_question_hash ON votes (question_hash);

-- ── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can vote" ON votes;
CREATE POLICY "Anyone can vote"
  ON votes FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read votes" ON votes;
CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  TO anon
  USING (true);

-- No UPDATE or DELETE policies: with RLS on, that means denied by default.

-- ── Leaderboard ────────────────────────────────────────────────────────────
-- Drives the weekly seed-promotion procedure (see README).
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  question_hash,
  max(question_text)                                        AS question_text,
  max(template_id)                                          AS template_id,
  round(avg(score)::numeric, 3)                             AS avg_score,
  count(*) FILTER (WHERE vote = 'hired')                    AS hired,
  count(*) FILTER (WHERE vote = 'resume_on_file')           AS on_file,
  count(*)                                                  AS total_votes,
  round(
    count(*) FILTER (WHERE vote = 'hired')::numeric
      / NULLIF(count(*), 0) * 100
  )                                                         AS approval_rate
FROM votes
GROUP BY question_hash
ORDER BY approval_rate DESC, total_votes DESC;
