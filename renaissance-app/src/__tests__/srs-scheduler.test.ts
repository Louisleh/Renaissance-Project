import { describe, it, expect } from 'vitest';
import { getDueCards, countDueCards } from '../lib/srs/scheduler';
import { initialState, rate } from '../lib/srs/fsrs';
import { RATING_GOOD } from '../types/cards';
import { getAllCards } from '../data/flashcards';
import type { CardState } from '../types/cards';

function makeStates(): Record<string, CardState> {
  return {};
}

describe('Scheduler', () => {
  it('returns new cards when no state exists', () => {
    const picks = getDueCards(makeStates(), { limit: 5, now: new Date('2026-01-01T00:00:00Z') });
    expect(picks).toHaveLength(5);
    expect(picks.every((p) => p.isNew)).toBe(true);
  });

  it('respects the limit option', () => {
    const picks = getDueCards(makeStates(), { limit: 3, now: new Date('2026-01-01T00:00:00Z') });
    expect(picks).toHaveLength(3);
  });

  it('caps cards per domain at the default share', () => {
    const picks = getDueCards(makeStates(), { limit: 20, now: new Date('2026-01-01T00:00:00Z') });
    const perDomain = new Map<string, number>();
    for (const pick of picks) {
      perDomain.set(pick.card.domain, (perDomain.get(pick.card.domain) ?? 0) + 1);
    }
    for (const count of perDomain.values()) {
      expect(count).toBeLessThanOrEqual(Math.ceil(20 * 0.4));
    }
  });

  it('prioritizes due reviewed cards over new cards', () => {
    const states = makeStates();
    const allCards = getAllCards();
    const pastCard = allCards[0];
    const reviewedAt = new Date('2026-01-01T00:00:00Z');
    const outcome = rate(initialState(pastCard.id, pastCard.domain, reviewedAt), RATING_GOOD, reviewedAt);
    // Force the card to be due by backdating updated_at and due_at
    states[pastCard.id] = {
      ...outcome.nextState,
      due_at: new Date('2026-01-02T00:00:00Z').toISOString(),
    };

    const picks = getDueCards(states, {
      limit: 5,
      now: new Date('2026-01-15T00:00:00Z'),
    });

    const first = picks.find((p) => p.card.id === pastCard.id);
    expect(first).toBeTruthy();
    expect(first?.isNew).toBe(false);
  });

  it('countDueCards returns 0 for an empty state map', () => {
    expect(countDueCards(makeStates())).toBe(0);
  });

  it('countDueCards counts cards whose due_at is in the past', () => {
    const states: Record<string, CardState> = {};
    const cards = getAllCards().slice(0, 3);
    for (const card of cards) {
      const reviewedAt = new Date('2026-01-01T00:00:00Z');
      const outcome = rate(initialState(card.id, card.domain, reviewedAt), RATING_GOOD, reviewedAt);
      states[card.id] = {
        ...outcome.nextState,
        due_at: new Date('2026-01-02T00:00:00Z').toISOString(),
      };
    }
    expect(countDueCards(states, new Date('2026-01-15T00:00:00Z'))).toBe(3);
  });

  it('caps new cards per low-coverage domain at 3 (progressive introduction)', () => {
    const picks = getDueCards(makeStates(), { limit: 20, now: new Date('2026-01-01T00:00:00Z') });
    const newPerDomain = new Map<string, number>();
    for (const pick of picks) {
      if (!pick.isNew) continue;
      newPerDomain.set(pick.card.domain, (newPerDomain.get(pick.card.domain) ?? 0) + 1);
    }
    for (const [, count] of newPerDomain.entries()) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it('favors growth domain new cards when no due cards exist', () => {
    const picks = getDueCards(makeStates(), {
      limit: 5,
      now: new Date('2026-01-01T00:00:00Z'),
      growthDomains: ['Biology'],
    });
    const biologyCount = picks.filter((p) => p.card.domain === 'Biology').length;
    expect(biologyCount).toBeGreaterThan(0);
  });
});
