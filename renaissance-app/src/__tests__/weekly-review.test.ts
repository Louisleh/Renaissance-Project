import { describe, it, expect, beforeEach } from 'vitest';
import {
  weeklyReviewAvailable,
  markWeeklyReviewComplete,
  WEEKLY_REVIEW_STATE_KEY,
} from '../lib/progression/weekly-review';

function clear() {
  window.localStorage.removeItem(WEEKLY_REVIEW_STATE_KEY);
}

describe('Weekly review', () => {
  beforeEach(() => {
    clear();
  });

  it('is unavailable on weekdays', () => {
    const wednesday = new Date('2026-04-22T10:00:00'); // Wednesday
    expect(weeklyReviewAvailable(wednesday)).toBe(false);
  });

  it('is available on Saturday when not yet completed this week', () => {
    const saturday = new Date('2026-04-25T10:00:00');
    expect(weeklyReviewAvailable(saturday)).toBe(true);
  });

  it('is available on Sunday when not yet completed this week', () => {
    const sunday = new Date('2026-04-26T10:00:00');
    expect(weeklyReviewAvailable(sunday)).toBe(true);
  });

  it('is unavailable after being marked complete', () => {
    const saturday = new Date('2026-04-25T10:00:00');
    markWeeklyReviewComplete(saturday);
    expect(weeklyReviewAvailable(saturday)).toBe(false);
  });

  it('is available the next weekend after a completion in the prior week', () => {
    const firstSaturday = new Date('2026-04-25T10:00:00');
    markWeeklyReviewComplete(firstSaturday);
    const nextSaturday = new Date('2026-05-02T10:00:00');
    expect(weeklyReviewAvailable(nextSaturday)).toBe(true);
  });
});
