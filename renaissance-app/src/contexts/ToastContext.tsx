import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ToastContainer, type ToastItem, type ToastVariant } from '../components/common/Toast';
import { onStorageError, type StorageErrorKind } from '../lib/safe-local-storage';

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => undefined,
});

let nextId = 0;

const STORAGE_ERROR_COOLDOWN_MS = 30_000;

const STORAGE_ERROR_MESSAGES: Record<StorageErrorKind, string> = {
  quota: 'Your device storage is full. Some progress could not be saved locally.',
  unavailable: 'Local storage is unavailable. Progress is only synced to your account.',
  serialize: 'Could not save progress locally. Please refresh and try again.',
  unknown: 'Could not save progress locally.',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastShownRef = useRef<Partial<Record<StorageErrorKind, number>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++nextId}`;
    setToasts((prev) => [...prev, { id, message, variant, duration: 5000 }]);
  }, []);

  useEffect(() => {
    return onStorageError((error) => {
      const now = Date.now();
      const last = lastShownRef.current[error.kind] ?? 0;
      if (now - last < STORAGE_ERROR_COOLDOWN_MS) return;
      lastShownRef.current[error.kind] = now;
      show(STORAGE_ERROR_MESSAGES[error.kind], 'error');
    });
  }, [show]);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
