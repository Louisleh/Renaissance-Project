import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  appendCommonplaceEntry,
  clearLocalCommonplace,
  COMMONPLACE_KEY,
  loadCommonplaceEntries,
  promptOfTheDay,
} from '../lib/progression/commonplace';
import { onStorageError, type StorageError } from '../lib/safe-local-storage';
import { resetStorageChaos, stubLocalStorageQuota } from '../test/storage-chaos';

describe('commonplace', () => {
  beforeEach(() => {
    resetStorageChaos();
    clearLocalCommonplace();
  });

  afterEach(() => {
    resetStorageChaos();
    clearLocalCommonplace();
  });

  it('appendCommonplaceEntry with no user id persists locally and keeps synced=false', async () => {
    const entry = await appendCommonplaceEntry(
      {
        prompt_id: 'daily_observation',
        prompt_text: 'What did you notice today?',
        body: 'Saw a hawk.',
        domain_hint: null,
      },
      null,
    );
    expect(entry.synced).toBe(false);
    const entries = loadCommonplaceEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(entry.id);
  });

  it('preserves insertion order across multiple appends', async () => {
    await appendCommonplaceEntry(
      { prompt_id: 'a', prompt_text: 'A?', body: 'first', domain_hint: null },
      null,
    );
    await appendCommonplaceEntry(
      { prompt_id: 'b', prompt_text: 'B?', body: 'second', domain_hint: 'Biology' },
      null,
    );
    const entries = loadCommonplaceEntries();
    expect(entries.map((e) => e.body)).toEqual(['first', 'second']);
  });

  it('returns empty array when stored JSON is corrupt', () => {
    window.localStorage.setItem(COMMONPLACE_KEY, '[not json');
    expect(loadCommonplaceEntries()).toEqual([]);
  });

  it('promptOfTheDay is deterministic for a given seed', () => {
    const seed = Date.UTC(2026, 3, 24);
    expect(promptOfTheDay(seed).id).toBe(promptOfTheDay(seed).id);
  });

  it('emits a quota error if local persistence fails', async () => {
    const errors: StorageError[] = [];
    const off = onStorageError((e) => errors.push(e));
    const handle = stubLocalStorageQuota();
    try {
      await appendCommonplaceEntry(
        { prompt_id: 'x', prompt_text: 'x?', body: 'x', domain_hint: null },
        null,
      );
      expect(errors.some((e) => e.kind === 'quota')).toBe(true);
    } finally {
      handle.restore();
      off();
    }
  });
});
