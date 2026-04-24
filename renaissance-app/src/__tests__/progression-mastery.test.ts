import { describe, it, expect } from 'vitest';
import {
  perKnowledgeDomainMastery,
  synthesisIndex,
  masterySnapshot,
  MASTERY_STABILITY_CEILING_DAYS,
} from '../lib/progression/mastery';
import { initialState } from '../lib/srs/fsrs';
import { KNOWLEDGE_DOMAINS, type CardState } from '../types/cards';
import { getAllCards, getCardsByDomain } from '../data/flashcards';

function setStability(state: CardState, stability: number): CardState {
  return { ...state, reps: 1, stability, last_review: new Date().toISOString(), state: 2 };
}

describe('Mastery', () => {
  it('returns zero mastery for all domains when no states exist', () => {
    const result = perKnowledgeDomainMastery({});
    expect(result).toHaveLength(KNOWLEDGE_DOMAINS.length);
    for (const d of result) {
      expect(d.mastery).toBe(0);
      expect(d.reviewedCount).toBe(0);
    }
  });

  it('mastery tracks stability relative to the ceiling', () => {
    const biologyCards = getCardsByDomain('Biology');
    const states: Record<string, CardState> = {};
    for (const card of biologyCards) {
      const base = initialState(card.id, card.domain);
      states[card.id] = setStability(base, MASTERY_STABILITY_CEILING_DAYS);
    }
    const result = perKnowledgeDomainMastery(states);
    const biology = result.find((d) => d.domain === 'Biology');
    expect(biology?.mastery).toBe(100);
    expect(biology?.reviewedCount).toBe(biologyCards.length);
    expect(biology?.coverage).toBe(1);
  });

  it('partial coverage reduces mastery proportionally', () => {
    const biologyCards = getCardsByDomain('Biology');
    const half = Math.floor(biologyCards.length / 2);
    const states: Record<string, CardState> = {};
    for (let i = 0; i < half; i++) {
      const card = biologyCards[i];
      const base = initialState(card.id, card.domain);
      states[card.id] = setStability(base, MASTERY_STABILITY_CEILING_DAYS);
    }
    const result = perKnowledgeDomainMastery(states);
    const biology = result.find((d) => d.domain === 'Biology');
    expect(biology?.mastery).toBeGreaterThan(40);
    expect(biology?.mastery).toBeLessThan(60);
  });

  it('synthesis index is zero when no progress exists', () => {
    expect(synthesisIndex({})).toBeLessThanOrEqual(1);
  });

  it('synthesis index is dragged down by an untouched domain', () => {
    const states: Record<string, CardState> = {};
    for (const card of getAllCards().slice(0, 60)) {
      const base = initialState(card.id, card.domain);
      states[card.id] = setStability(base, MASTERY_STABILITY_CEILING_DAYS);
    }
    const snap = masterySnapshot(states);
    const untouched = snap.domains.filter((d) => d.mastery === 0);
    expect(untouched.length).toBeGreaterThan(0);
    expect(snap.synthesis_index).toBeLessThan(25);
  });

  it('masterySnapshot reports a Strong or Signature level when all domains are saturated', () => {
    const states: Record<string, CardState> = {};
    for (const card of getAllCards()) {
      const base = initialState(card.id, card.domain);
      states[card.id] = setStability(base, MASTERY_STABILITY_CEILING_DAYS);
    }
    const snap = masterySnapshot(states);
    expect(snap.synthesis_index).toBeGreaterThanOrEqual(90);
  });
});
