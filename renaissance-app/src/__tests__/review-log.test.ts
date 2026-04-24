import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendReview,
  clearLocalReviewLog,
  loadReviewLog,
  MAX_LOCAL_REVIEW_ENTRIES,
  REVIEW_LOG_KEY,
} from '../lib/srs/review-log';
import { onStorageError, type StorageError } from '../lib/safe-local-storage';
import { resetStorageChaos, stubLocalStorageQuota } from '../test/storage-chaos';
import { RATING_GOOD, type ReviewLogEntry } from '../types/cards';

function seed(entries: ReviewLogEntry[]): void {
  window.localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(entries));
}

function makeEntry(overrides: Partial<ReviewLogEntry> = {}): ReviewLogEntry {
  return {
    id: overrides.id ?? 'entry-0',
    card_id: 'biology:dna',
    domain: 'Biology',
    rating: RATING_GOOD,
    duration_ms: 1200,
    prev_stability: null,
    next_stability: 2.5,
    reviewed_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    synced: false,
    ...overrides,
  };
}

describe('review-log', () => {
  beforeEach(() => {
    resetStorageChaos();
    clearLocalReviewLog();
  });

  afterEach(() => {
    resetStorageChaos();
    clearLocalReviewLog();
  });

  it('appendReview with no userId persists locally and keeps synced=false', async () => {
    const entry = await appendReview(
      {
        card_id: 'biology:dna',
        domain: 'Biology',
        rating: RATING_GOOD,
        duration_ms: 1200,
        prev_stability: null,
        next_stability: 2.5,
      },
      null,
    );
    expect(entry.synced).toBe(false);
    const log = loadReviewLog();
    expect(log).toHaveLength(1);
    expect(log[0].id).toBe(entry.id);
    expect(log[0].synced).toBe(false);
  });

  it('truncates to MAX_LOCAL_REVIEW_ENTRIES, keeping the newest rows', async () => {
    const bloated: ReviewLogEntry[] = [];
    for (let i = 0; i < MAX_LOCAL_REVIEW_ENTRIES; i += 1) {
      bloated.push(makeEntry({ id: `old-${i}` }));
    }
    seed(bloated);

    await appendReview(
      {
        card_id: 'biology:dna',
        domain: 'Biology',
        rating: RATING_GOOD,
        duration_ms: 1200,
        prev_stability: null,
        next_stability: 2.5,
      },
      null,
    );

    const log = loadReviewLog();
    expect(log).toHaveLength(MAX_LOCAL_REVIEW_ENTRIES);
    expect(log[0].id).toBe('old-1');
    expect(log[log.length - 1].id).not.toBe('old-0');
    expect(log[log.length - 1].card_id).toBe('biology:dna');
  });

  it('returns an empty list when stored JSON is corrupt', () => {
    window.localStorage.setItem(REVIEW_LOG_KEY, '[not json');
    expect(loadReviewLog()).toEqual([]);
  });

  it('emits a quota error when local persistence fails', async () => {
    const errors: StorageError[] = [];
    const off = onStorageError((e) => errors.push(e));
    const handle = stubLocalStorageQuota();
    try {
      await appendReview(
        {
          card_id: 'biology:dna',
          domain: 'Biology',
          rating: RATING_GOOD,
          duration_ms: 1200,
          prev_stability: null,
          next_stability: 2.5,
        },
        null,
      );
      expect(errors.some((e) => e.kind === 'quota')).toBe(true);
    } finally {
      handle.restore();
      off();
    }
  });
});
