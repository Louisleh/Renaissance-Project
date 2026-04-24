import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock, type SupabaseMock } from '../test/supabase-mock';

let mock: SupabaseMock;

vi.mock('../lib/supabase', () => ({
  get supabase() {
    return mock.client;
  },
  get isSupabaseConfigured() {
    return true;
  },
}));

// must import after vi.mock setup
import {
  appendReview,
  clearLocalReviewLog,
  flushUnsyncedReviews,
  loadReviewLog,
} from '../lib/srs/review-log';
import { RATING_GOOD } from '../types/cards';
import { resetStorageChaos } from '../test/storage-chaos';

function input() {
  return {
    card_id: 'biology:dna',
    domain: 'Biology' as const,
    rating: RATING_GOOD,
    duration_ms: 1200,
    prev_stability: null,
    next_stability: 2.5,
  };
}

describe('review-log integration', () => {
  beforeEach(() => {
    mock = createSupabaseMock();
    resetStorageChaos();
    clearLocalReviewLog();
  });

  afterEach(() => {
    mock.reset();
    resetStorageChaos();
    clearLocalReviewLog();
  });

  it('marks synced=true when card_reviews insert succeeds', async () => {
    const entry = await appendReview(input(), 'user-1');
    expect(entry.synced).toBe(true);
    const log = loadReviewLog();
    expect(log).toHaveLength(1);
    expect(log[0].synced).toBe(true);

    const inserts = mock.calls.filter((c) => c.table === 'card_reviews' && c.operation === 'insert');
    expect(inserts).toHaveLength(1);
    expect((inserts[0].payload as { user_id: string }).user_id).toBe('user-1');
  });

  it('leaves synced=false when card_reviews insert fails', async () => {
    mock.setResponse('card_reviews', 'insert', {
      data: null,
      error: { message: 'upstream 500' },
    });

    const entry = await appendReview(input(), 'user-1');
    expect(entry.synced).toBe(false);
    const log = loadReviewLog();
    expect(log[0].synced).toBe(false);
  });

  it('flushUnsyncedReviews retries unsynced rows and marks them synced on success', async () => {
    mock.setResponse('card_reviews', 'insert', {
      data: null,
      error: { message: 'temporary 500' },
    });
    await appendReview(input(), 'user-1');
    await appendReview({ ...input(), card_id: 'biology:rna' }, 'user-1');
    expect(loadReviewLog().every((e) => !e.synced)).toBe(true);

    mock.setResponse('card_reviews', 'insert', { data: null, error: null });
    await flushUnsyncedReviews('user-1');

    const log = loadReviewLog();
    expect(log.every((e) => e.synced)).toBe(true);
    const retryInserts = mock.calls.filter(
      (c) => c.table === 'card_reviews' && c.operation === 'insert',
    );
    // two appendReview attempts (both failed) + one flush call
    expect(retryInserts.length).toBeGreaterThanOrEqual(3);
  });

  it('flushUnsyncedReviews is a no-op when nothing is unsynced', async () => {
    await flushUnsyncedReviews('user-1');
    expect(mock.calls.filter((c) => c.operation === 'insert')).toHaveLength(0);
  });
});
