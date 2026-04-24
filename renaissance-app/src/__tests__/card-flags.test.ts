import { describe, it, expect, beforeEach } from 'vitest';
import { setCardFlag, getCardFlag, clearCardFlag, isCardActive, clearLocalCardFlags } from '../lib/srs/card-flags';

describe('Card flags', () => {
  beforeEach(() => {
    clearLocalCardFlags();
  });

  it('suspended cards are inactive', () => {
    setCardFlag('biology:dna', 'suspended');
    expect(isCardActive('biology:dna')).toBe(false);
  });

  it('reported cards are inactive', () => {
    setCardFlag('biology:dna', 'reported', { reason: 'broken' });
    expect(isCardActive('biology:dna')).toBe(false);
  });

  it('buried cards are inactive until the bury period expires', () => {
    setCardFlag('biology:dna', 'buried', { buryDays: 7 });
    const flag = getCardFlag('biology:dna');
    expect(flag?.status).toBe('buried');
    expect(flag?.bury_until).not.toBe(null);
    expect(isCardActive('biology:dna', new Date())).toBe(false);
    const future = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(isCardActive('biology:dna', future)).toBe(true);
  });

  it('unflagged cards are active by default', () => {
    expect(isCardActive('random:card')).toBe(true);
  });

  it('clearCardFlag removes the flag', () => {
    setCardFlag('x:y', 'suspended');
    expect(isCardActive('x:y')).toBe(false);
    clearCardFlag('x:y');
    expect(isCardActive('x:y')).toBe(true);
  });
});
