export type StorageErrorKind = 'quota' | 'unavailable' | 'serialize' | 'unknown';

export interface StorageError {
  kind: StorageErrorKind;
  key: string;
  cause: unknown;
}

type Listener = (error: StorageError) => void;
const listeners = new Set<Listener>();

export function onStorageError(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(error: StorageError): void {
  for (const listener of listeners) {
    try {
      listener(error);
    } catch {
      // a faulty listener must not break storage callers
    }
  }
}

function classify(cause: unknown): StorageErrorKind {
  if (typeof DOMException !== 'undefined' && cause instanceof DOMException) {
    if (
      cause.name === 'QuotaExceededError' ||
      cause.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      cause.code === 22 ||
      cause.code === 1014
    ) {
      return 'quota';
    }
  }
  if (cause instanceof Error && /quota/i.test(cause.message)) {
    return 'quota';
  }
  return 'unknown';
}

export function safeRead<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (cause) {
    emit({ kind: 'serialize', key, cause });
    return null;
  }
}

export function safeWrite<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (cause) {
    emit({ kind: 'serialize', key, cause });
    return false;
  }
  try {
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (cause) {
    emit({ kind: classify(cause), key, cause });
    return false;
  }
}

export function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (cause) {
    emit({ kind: 'unknown', key, cause });
  }
}

export function __resetStorageErrorListenersForTests(): void {
  listeners.clear();
}
