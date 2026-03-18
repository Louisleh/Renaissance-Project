import { describe, expect, it } from 'vitest';
import { featureMatrix, hasAccess, isPaidTier } from '../lib/subscription';

describe('subscription access', () => {
  it('grants deep dive access to pro and premium only', () => {
    expect(hasAccess('free', 'deep_dive')).toBe(false);
    expect(hasAccess('pro', 'deep_dive')).toBe(true);
    expect(hasAccess('premium', 'deep_dive')).toBe(true);
  });

  it('grants personalized reading to premium only', () => {
    expect(hasAccess('free', 'personalized_reading')).toBe(false);
    expect(hasAccess('pro', 'personalized_reading')).toBe(false);
    expect(hasAccess('premium', 'personalized_reading')).toBe(true);
  });

  it('defines access tiers for every feature', () => {
    Object.entries(featureMatrix).forEach(([, tiers]) => {
      expect(tiers.length).toBeGreaterThan(0);
    });
  });

  it('identifies paid tiers correctly', () => {
    expect(isPaidTier('free')).toBe(false);
    expect(isPaidTier('pro')).toBe(true);
    expect(isPaidTier('premium')).toBe(true);
  });
});
