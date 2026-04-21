import { describe, it, expect } from 'vitest';
import { computeStreak, crossedMilestones, heatmap, uniqueStudyDays } from '../lib/progression/streak';
import type { ReviewLogEntry } from '../types/cards';

function entry(isoDate: string): ReviewLogEntry {
  return {
    id: Math.random().toString(16).slice(2),
    card_id: 'x:y',
    domain: 'Biology',
    rating: 3,
    duration_ms: 5000,
    prev_stability: 0,
    next_stability: 1,
    reviewed_at: isoDate,
    synced: false,
  };
}

describe('Streak', () => {
  it('returns zero for an empty log', () => {
    expect(computeStreak([], new Date('2026-04-21T12:00:00'))).toBe(0);
  });

  it('counts today when a review exists today', () => {
    const now = new Date('2026-04-21T12:00:00');
    const log = [entry('2026-04-21T09:00:00')];
    expect(computeStreak(log, now)).toBe(1);
  });

  it('counts backwards across consecutive days', () => {
    const now = new Date('2026-04-21T12:00:00');
    const log = [
      entry('2026-04-19T09:00:00'),
      entry('2026-04-20T09:00:00'),
      entry('2026-04-21T09:00:00'),
    ];
    expect(computeStreak(log, now)).toBe(3);
  });

  it('stops at the first missed day', () => {
    const now = new Date('2026-04-21T12:00:00');
    const log = [
      entry('2026-04-17T09:00:00'),
      entry('2026-04-19T09:00:00'),
      entry('2026-04-20T09:00:00'),
      entry('2026-04-21T09:00:00'),
    ];
    expect(computeStreak(log, now)).toBe(3);
  });

  it('allows yesterday to be the anchor if nothing today', () => {
    const now = new Date('2026-04-21T12:00:00');
    const log = [
      entry('2026-04-19T09:00:00'),
      entry('2026-04-20T09:00:00'),
    ];
    expect(computeStreak(log, now)).toBe(2);
  });

  it('crossedMilestones reports only newly crossed thresholds', () => {
    expect(crossedMilestones(6, 7).map((m) => m.days)).toEqual([7]);
    expect(crossedMilestones(7, 8).map((m) => m.days)).toEqual([]);
    expect(crossedMilestones(29, 100).map((m) => m.days)).toEqual([30, 100]);
  });

  it('uniqueStudyDays de-dupes same-day entries', () => {
    const log = [
      entry('2026-04-21T09:00:00'),
      entry('2026-04-21T18:00:00'),
      entry('2026-04-20T09:00:00'),
    ];
    expect(uniqueStudyDays(log)).toHaveLength(2);
  });

  it('heatmap returns N consecutive days ending today', () => {
    const now = new Date('2026-04-21T12:00:00');
    const log = [entry('2026-04-21T09:00:00'), entry('2026-04-18T09:00:00')];
    const h = heatmap(log, now, 7);
    expect(h).toHaveLength(7);
    expect(h[h.length - 1].count).toBe(1);
    expect(h.find((d) => d.day === '2026-04-18')?.count).toBe(1);
  });
});
