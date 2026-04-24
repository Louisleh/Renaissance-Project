import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CARD_STATES_KEY,
  clearLocalCardStates,
  loadCardState,
  loadCardStates,
  saveCardState,
} from '../lib/srs/card-state-store';
import { onStorageError, type StorageError } from '../lib/safe-local-storage';
import { resetStorageChaos, stubLocalStorageQuota } from '../test/storage-chaos';
import { CARD_SET_VERSION, STATE_NEW, type CardState } from '../types/cards';

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

describe('card-state-store', () => {
  beforeEach(() => {
    resetStorageChaos();
    clearLocalCardStates();
  });

  afterEach(() => {
    resetStorageChaos();
    clearLocalCardStates();
  });

  it('loadCardStates returns an empty map when nothing is stored', () => {
    expect(loadCardStates()).toEqual({});
  });

  it('saveCardState persists locally and loadCardState reads back', async () => {
    const state = makeState();
    await saveCardState(state, null);
    expect(loadCardState(state.card_id)).toEqual(state);
  });

  it('falls back to empty map when stored JSON is corrupt', () => {
    window.localStorage.setItem(CARD_STATES_KEY, '{truncated');
    expect(loadCardStates()).toEqual({});
  });

  it('clearLocalCardStates wipes the entry', async () => {
    await saveCardState(makeState(), null);
    clearLocalCardStates();
    expect(loadCardStates()).toEqual({});
  });

  it('emits a quota error if local write fails', async () => {
    const errors: StorageError[] = [];
    const off = onStorageError((e) => errors.push(e));
    const handle = stubLocalStorageQuota();
    try {
      await saveCardState(makeState(), null);
      expect(errors.some((e) => e.kind === 'quota')).toBe(true);
    } finally {
      handle.restore();
      off();
    }
  });
});
