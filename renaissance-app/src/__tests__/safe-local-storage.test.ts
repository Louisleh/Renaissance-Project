import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  safeRead,
  safeWrite,
  safeRemove,
  onStorageError,
  type StorageError,
} from '../lib/safe-local-storage';
import { resetStorageChaos, stubLocalStorageQuota } from '../test/storage-chaos';

describe('safe-local-storage', () => {
  beforeEach(() => {
    resetStorageChaos();
  });

  afterEach(() => {
    resetStorageChaos();
  });

  it('round-trips JSON-serializable values', () => {
    expect(safeWrite('k', { a: 1, b: [2, 3] })).toBe(true);
    expect(safeRead<{ a: number; b: number[] }>('k')).toEqual({ a: 1, b: [2, 3] });
  });

  it('returns null when key is missing', () => {
    expect(safeRead('nope')).toBeNull();
  });

  it('returns null and emits serialize error when stored JSON is corrupt', () => {
    window.localStorage.setItem('corrupt', '{not json');
    const errors: StorageError[] = [];
    const off = onStorageError((e) => errors.push(e));
    expect(safeRead('corrupt')).toBeNull();
    off();
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('serialize');
    expect(errors[0].key).toBe('corrupt');
  });

  it('emits quota error and returns false when setItem throws QuotaExceededError', () => {
    const handle = stubLocalStorageQuota();
    const errors: StorageError[] = [];
    const off = onStorageError((e) => errors.push(e));
    try {
      const ok = safeWrite('k', { big: 'payload' });
      expect(ok).toBe(false);
      expect(errors).toHaveLength(1);
      expect(errors[0].kind).toBe('quota');
      expect(errors[0].key).toBe('k');
    } finally {
      off();
      handle.restore();
    }
  });

  it('safeRemove silently no-ops for missing keys', () => {
    expect(() => safeRemove('absent')).not.toThrow();
  });

  it('unsubscribed listeners stop receiving events', () => {
    const spy = vi.fn();
    const off = onStorageError(spy);
    off();
    window.localStorage.setItem('corrupt', '{');
    safeRead('corrupt');
    expect(spy).not.toHaveBeenCalled();
  });

  it('a throwing listener does not break other listeners', () => {
    const good = vi.fn();
    const offBad = onStorageError(() => {
      throw new Error('boom');
    });
    const offGood = onStorageError(good);
    try {
      window.localStorage.setItem('corrupt', '{');
      safeRead('corrupt');
      expect(good).toHaveBeenCalledOnce();
    } finally {
      offBad();
      offGood();
    }
  });

  it('rejects non-serializable values without throwing', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(safeWrite('cyclic', cyclic)).toBe(false);
  });
});
