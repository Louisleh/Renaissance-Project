import { useEffect, useState } from 'react';
import './Toast.css';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastMessage({ toast, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExiting(true);
    }, toast.duration);

    return () => window.clearTimeout(timer);
  }, [toast.duration]);

  useEffect(() => {
    if (!exiting) {
      return;
    }

    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, 250); // match slide-out duration

    return () => window.clearTimeout(timer);
  }, [exiting, onDismiss, toast.id]);

  return (
    <div
      className={`toast toast--${toast.variant}${exiting ? ' toast-exit' : ''}`}
      onClick={() => setExiting(true)}
      role="status"
      aria-live="polite"
    >
      {toast.message}
      <div
        className="toast-progress"
        style={{ animationDuration: `${toast.duration}ms` }}
      />
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
