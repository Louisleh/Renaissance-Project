import { describe, it, expect } from 'vitest';
import { initialState, rate, daysUntilDue, isDue, isNew } from '../lib/srs/fsrs';
import { RATING_GOOD, RATING_AGAIN, STATE_NEW } from '../types/cards';

describe('FSRS adapter', () => {
  it('initialState produces a new card with zero stability and state=New', () => {
    const state = initialState('biology:dna', 'Biology');
    expect(state.card_id).toBe('biology:dna');
    expect(state.domain).toBe('Biology');
    expect(state.stability).toBe(0);
    expect(state.difficulty).toBe(0);
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.state).toBe(STATE_NEW);
    expect(state.last_review).toBe(null);
    expect(isNew(state)).toBe(true);
  });

  it('rate with Good advances stability and records last_review', () => {
    const start = initialState('biology:dna', 'Biology', new Date('2026-01-01T00:00:00Z'));
    const outcome = rate(start, RATING_GOOD, new Date('2026-01-01T00:00:00Z'));
    expect(outcome.nextStability).toBeGreaterThan(0);
    expect(outcome.nextState.last_review).not.toBe(null);
    expect(outcome.nextState.reps).toBe(1);
  });

  it('Again rating diverges from Good rating on the same state', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const start = initialState('biology:dna', 'Biology', now);
    const good = rate(start, RATING_GOOD, now);
    const again = rate(start, RATING_AGAIN, now);
    expect(again.nextState.difficulty).not.toBe(good.nextState.difficulty);
    expect(again.nextState.due_at).not.toBe(good.nextState.due_at);
  });

  it('daysUntilDue reflects the new due_at after a review', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const start = initialState('biology:dna', 'Biology', now);
    const outcome = rate(start, RATING_GOOD, now);
    const gap = daysUntilDue(outcome.nextState, now);
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  it('isDue returns true for a freshly initialized card at now', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const state = initialState('biology:dna', 'Biology', now);
    expect(isDue(state, now)).toBe(true);
  });

  it('rating a card is deterministic for identical inputs', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const a = rate(initialState('x:y', 'Biology', now), RATING_GOOD, now);
    const b = rate(initialState('x:y', 'Biology', now), RATING_GOOD, now);
    expect(a.nextState.stability).toBe(b.nextState.stability);
    expect(a.nextState.difficulty).toBe(b.nextState.difficulty);
  });
});
