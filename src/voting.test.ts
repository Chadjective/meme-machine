import { describe, expect, it } from 'vitest';
import { buildVotePayload, questionVoteKey } from './voting';

// These are the pure halves of voting.ts. The localStorage/Supabase halves are
// side-effectful and covered by the browser-level Stage 6 verification instead.

describe('questionVoteKey', () => {
  it('is stable for the same text', () => {
    const text = 'Are you comfortable being slashable?';
    expect(questionVoteKey(text)).toBe(questionVoteKey(text));
  });

  it('is 8 lowercase hex chars', () => {
    expect(questionVoteKey('Why do you believe in vitriol singularities?')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('separates different questions', () => {
    expect(questionVoteKey('You gotta be optimizing homomorphic encryption.')).not.toBe(
      questionVoteKey('You gotta be optimizing homomorphic encryptions.')
    );
  });

  it('keys on the exact rendered text (case included)', () => {
    expect(questionVoteKey('Foo bar')).not.toBe(questionVoteKey('foo bar'));
  });
});

describe('buildVotePayload', () => {
  const question = {
    text: 'You gotta be optimizing homomorphic encryption.',
    templateId: 't21',
    score: 0.8123456,
  };

  it('keys the vote by hash but keeps the text — promotion needs it', () => {
    const payload = buildVotePayload(question, 'hired', 'device-1');
    expect(payload.question_hash).toBe(questionVoteKey(question.text));
    expect(payload.question_text).toBe(question.text);
    expect(payload.template_id).toBe('t21');
    expect(payload.vote).toBe('hired');
    expect(payload.device_id).toBe('device-1');
  });

  it('rounds the generator score to 4dp for storage', () => {
    expect(buildVotePayload(question, 'resume_on_file', 'device-1').score).toBe(0.8123);
  });

  it('carries both vote directions', () => {
    expect(buildVotePayload(question, 'resume_on_file', 'd').vote).toBe('resume_on_file');
  });
});
