import { __resetStorageErrorListenersForTests } from '../lib/safe-local-storage';

interface QuotaStubHandle {
  restore: () => void;
}

export function makeQuotaExceededError(): DOMException {
  if (typeof DOMException !== 'undefined') {
    try {
      return new DOMException('QuotaExceededError', 'QuotaExceededError');
    } catch {
      // fall through to Error fallback
    }
  }
  const err = new Error('QuotaExceededError');
  err.name = 'QuotaExceededError';
  return err as unknown as DOMException;
}

export function stubLocalStorageQuota(): QuotaStubHandle {
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const originalDescriptor = Object.getOwnPropertyDescriptor(proto, 'setItem');
  Object.defineProperty(proto, 'setItem', {
    configurable: true,
    writable: true,
    value: function stubbedSetItem() {
      throw makeQuotaExceededError();
    },
  });
  return {
    restore: () => {
      if (originalDescriptor) {
        Object.defineProperty(proto, 'setItem', originalDescriptor);
      } else {
        delete (proto as unknown as Record<string, unknown>).setItem;
      }
    },
  };
}

export function resetStorageChaos(): void {
  __resetStorageErrorListenersForTests();
  window.localStorage.clear();
}
