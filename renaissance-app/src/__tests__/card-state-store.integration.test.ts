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

import {
  clearLocalCardStates,
  loadCardStates,
  saveCardState,
  syncCardStatesOnSignIn,
} from '../lib/srs/card-state-store';
import { CARD_SET_VERSION, STATE_NEW, type CardState } from '../types/cards';
import { resetStorageChaos } from '../test/storage-chaos';

function makeState(overrides: Partial<CardState> = {}): CardState {
  return {
    card_id: 'biology:dna',
    card_set_version: CARD_SET_VERSION,
    domain: 'Biology',
    due_at: new Date('2026-02-01T00:00:00Z').toISOString(),
    stability: 1.5,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    state: STATE_NEW,
    last_review: new Date('2026-01-31T00:00:00Z').toISOString(),
    updated_at: new Date('2026-01-31T00:00:00Z').toISOString(),
    ...overrides,
  };
}

function row(overrides: Partial<CardState> & { card_id: string }) {
  return { ...makeState(overrides) };
}

describe('card-state-store integration', () => {
  beforeEach(() => {
    mock = createSupabaseMock();
    resetStorageChaos();
    clearLocalCardStates();
  });

  afterEach(() => {
    mock.reset();
    resetStorageChaos();
    clearLocalCardStates();
  });

  it('saveCardState upserts on card_states with the user id', async () => {
    await saveCardState(makeState(), 'user-1');
    const upserts = mock.calls.filter(
      (c) => c.table === 'card_states' && c.operation === 'upsert',
    );
    expect(upserts).toHaveLength(1);
    expect((upserts[0].payload as { user_id: string }).user_id).toBe('user-1');
    expect((upserts[0].options as { onConflict: string }).onConflict).toBe('user_id,card_id');
  });

  it('syncCardStatesOnSignIn pushes newer local rows and ignores older ones', async () => {
    const newerLocal = makeState({
      card_id: 'biology:dna',
      updated_at: new Date('2026-02-10T00:00:00Z').toISOString(),
    });
    const olderLocal = makeState({
      card_id: 'biology:rna',
      updated_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    });
    await saveCardState(newerLocal, null);
    await saveCardState(olderLocal, null);

    const remoteNewer = {
      ...row({ card_id: 'biology:rna' }),
      updated_at: new Date('2026-02-01T00:00:00Z').toISOString(),
    };
    mock.setResponse('card_states', 'select', { data: [remoteNewer], error: null });

    await syncCardStatesOnSignIn('user-1');

    const pushes = mock.calls.filter(
      (c) => c.table === 'card_states' && c.operation === 'upsert',
    );
    expect(pushes).toHaveLength(1);
    const rows = pushes[0].payload as Array<{ card_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].card_id).toBe('biology:dna');

    const merged = loadCardStates();
    expect(merged['biology:rna'].updated_at).toBe(remoteNewer.updated_at);
    expect(merged['biology:dna'].updated_at).toBe(newerLocal.updated_at);
  });

  it('syncCardStatesOnSignIn is a no-op when nothing is local and remote is empty', async () => {
    await syncCardStatesOnSignIn('user-1');
    const upserts = mock.calls.filter(
      (c) => c.table === 'card_states' && c.operation === 'upsert',
    );
    expect(upserts).toHaveLength(0);
  });
});
