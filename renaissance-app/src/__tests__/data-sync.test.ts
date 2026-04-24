import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearLocalUserData,
  loadAssessmentResult,
  saveAssessmentResult,
} from '../lib/data-sync';
import { onStorageError, type StorageError } from '../lib/safe-local-storage';
import { resetStorageChaos, stubLocalStorageQuota } from '../test/storage-chaos';
import { CARD_STATES_KEY } from '../lib/srs/card-state-store';
import { REVIEW_LOG_KEY } from '../lib/srs/review-log';
import { COMMONPLACE_KEY } from '../lib/progression/commonplace';
import { CARD_FLAGS_KEY } from '../lib/srs/card-flags';
import type { AssessmentResult, DomainKey, DomainLevels, DomainScores } from '../types';

const ASSESSMENT_KEYS = {
  quick_pulse: 'renaissance_quick_pulse_result',
  deep_dive: 'renaissance_deep_dive_result',
  llm_mirror: 'renaissance_llm_mirror_result',
} as const;

const DOMAIN_KEYS: DomainKey[] = [
  'leadership',
  'creativity',
  'strategy',
  'tech_proficiency',
  'problem_solving',
  'critical_thinking',
  'adaptability',
  'data_analysis',
];

function makeResult(): AssessmentResult {
  const scores = Object.fromEntries(DOMAIN_KEYS.map((k) => [k, 60])) as DomainScores;
  const levels = Object.fromEntries(
    DOMAIN_KEYS.map((k) => [k, 'Functional' as const]),
  ) as DomainLevels;
  return {
    assessment_id: 'quick_pulse_v1',
    assessment_name: 'Quick Pulse',
    completed_at: new Date('2026-04-01T12:00:00Z').toISOString(),
    response_count: 12,
    responses: [],
    scores,
    levels,
    top_strengths: ['strategy'],
    growth_domains: ['data_analysis'],
    archetype: {
      key: 'polymath',
      label: 'The Polymath',
      description: 'Wide-ranging curiosity.',
      confidence: 0.72,
    },
    balance_index: 0.6,
    recommended_modules: [],
  };
}

describe('data-sync (local-only paths)', () => {
  beforeEach(() => {
    resetStorageChaos();
  });

  afterEach(() => {
    resetStorageChaos();
  });

  it('saveAssessmentResult writes to localStorage when supabase is not configured', async () => {
    const result = makeResult();
    await saveAssessmentResult('quick_pulse', result, null, null);
    expect(loadAssessmentResult('quick_pulse')).toEqual(result);
  });

  it('loadAssessmentResult returns null when nothing is stored', () => {
    expect(loadAssessmentResult('quick_pulse')).toBeNull();
  });

  it('clearLocalUserData clears every renaissance_* key it owns', async () => {
    await saveAssessmentResult('quick_pulse', makeResult(), null, null);
    await saveAssessmentResult('deep_dive', makeResult(), null, null);
    window.localStorage.setItem(CARD_STATES_KEY, '{}');
    window.localStorage.setItem(REVIEW_LOG_KEY, '[]');
    window.localStorage.setItem(COMMONPLACE_KEY, '[]');
    window.localStorage.setItem(CARD_FLAGS_KEY, '{}');

    clearLocalUserData();

    for (const key of [
      ASSESSMENT_KEYS.quick_pulse,
      ASSESSMENT_KEYS.deep_dive,
      ASSESSMENT_KEYS.llm_mirror,
      CARD_STATES_KEY,
      REVIEW_LOG_KEY,
      COMMONPLACE_KEY,
      CARD_FLAGS_KEY,
    ]) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
  });

  it('surfaces a quota error when local persistence fails', async () => {
    const errors: StorageError[] = [];
    const off = onStorageError((e) => errors.push(e));
    const handle = stubLocalStorageQuota();
    try {
      await saveAssessmentResult('quick_pulse', makeResult(), null, null);
      expect(errors.some((e) => e.kind === 'quota')).toBe(true);
    } finally {
      handle.restore();
      off();
    }
  });
});
