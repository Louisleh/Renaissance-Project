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

import { saveAssessmentResult, syncOnSignIn } from '../lib/data-sync';
import type {
  AssessmentResult,
  DomainKey,
  DomainLevels,
  DomainScores,
} from '../types';
import { resetStorageChaos } from '../test/storage-chaos';

const QUICK_PULSE_KEY = 'renaissance_quick_pulse_result';

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

function makeResult(completedAt: string): AssessmentResult {
  const scores = Object.fromEntries(DOMAIN_KEYS.map((k) => [k, 60])) as DomainScores;
  const levels = Object.fromEntries(
    DOMAIN_KEYS.map((k) => [k, 'Functional' as const]),
  ) as DomainLevels;
  return {
    assessment_id: 'quick_pulse_v1',
    assessment_name: 'Quick Pulse',
    completed_at: completedAt,
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

describe('data-sync integration', () => {
  beforeEach(() => {
    mock = createSupabaseMock();
    resetStorageChaos();
  });

  afterEach(() => {
    mock.reset();
    resetStorageChaos();
  });

  it('saveAssessmentResult inserts an assessments row when user is authenticated', async () => {
    const result = makeResult('2026-04-01T12:00:00Z');
    await saveAssessmentResult('quick_pulse', result, null, 'user-1');

    const inserts = mock.calls.filter(
      (c) => c.table === 'assessments' && c.operation === 'insert',
    );
    expect(inserts).toHaveLength(1);
    const payload = inserts[0].payload as { user_id: string; assessment_type: string };
    expect(payload.user_id).toBe('user-1');
    expect(payload.assessment_type).toBe('quick_pulse');
  });

  it('syncOnSignIn pushes local-only assessments when remote is empty', async () => {
    const result = makeResult('2026-04-01T12:00:00Z');
    window.localStorage.setItem(QUICK_PULSE_KEY, JSON.stringify(result));

    mock.setResponse('assessments', 'select', { data: [], error: null });

    await syncOnSignIn('user-1');

    const inserts = mock.calls.filter(
      (c) => c.table === 'assessments' && c.operation === 'insert',
    );
    expect(inserts.length).toBeGreaterThanOrEqual(1);
    const payloads = inserts.map(
      (i) => (i.payload as { assessment_type: string }).assessment_type,
    );
    expect(payloads).toContain('quick_pulse');
  });

  it('syncOnSignIn does not re-insert an assessment already present remotely', async () => {
    const completedAt = '2026-04-01T12:00:00Z';
    const result = makeResult(completedAt);
    window.localStorage.setItem(QUICK_PULSE_KEY, JSON.stringify(result));

    mock.setResponse('assessments', 'select', {
      data: [
        {
          id: 'remote-1',
          assessment_type: 'quick_pulse',
          result,
          intelligence: null,
          created_at: completedAt,
        },
      ],
      error: null,
    });

    await syncOnSignIn('user-1');

    const inserts = mock.calls.filter(
      (c) => c.table === 'assessments' && c.operation === 'insert',
    );
    expect(inserts).toHaveLength(0);
  });
});
