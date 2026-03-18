import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'signin' | 'signup';
type SubmitMethod = 'email' | 'google' | null;

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { isAuthenticated, signInWithEmail, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitMethod, setSubmitMethod] = useState<SubmitMethod>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setSubmitMethod(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  const copy = useMemo(() => {
    return tab === 'signin'
      ? {
          title: 'Sign in to sync your Renaissance profile',
          body: 'Use a magic link or Google to save assessments, preserve curriculum progress, and unlock your history view across devices.',
          button: 'Send magic link',
        }
      : {
          title: 'Create your Renaissance account',
          body: 'Create an account to turn local exploration into a persistent longitudinal profile with saved development history.',
          button: 'Create account with magic link',
        };
  }, [tab]);

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter an email address to continue.');
      return;
    }

    setSubmitMethod('email');
    setError(null);

    const { error: nextError } = await signInWithEmail(trimmedEmail);
    if (nextError) {
      setError(nextError.message);
      setSuccess(false);
    } else {
      setSuccess(true);
    }

    setSubmitMethod(null);
  };

  const handleGoogleClick = async () => {
    setSubmitMethod('google');
    setError(null);

    const { error: nextError } = await signInWithGoogle();
    if (nextError) {
      setError(nextError.message);
      setSubmitMethod(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="auth-container">
        <button className="auth-close" onClick={onClose} aria-label="Close sign in dialog">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            className={`auth-tab${tab === 'signin' ? ' is-active' : ''}`}
            onClick={() => setTab('signin')}
            role="tab"
            aria-selected={tab === 'signin'}
          >
            Sign in
          </button>
          <button
            className={`auth-tab${tab === 'signup' ? ' is-active' : ''}`}
            onClick={() => setTab('signup')}
            role="tab"
            aria-selected={tab === 'signup'}
          >
            Create account
          </button>
        </div>

        <div className="auth-copy">
          <div className="eyebrow">Accounts & Sync</div>
          <h2>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="auth-message-panel">
            <h3>Accounts are not configured in this environment.</h3>
            <p>
              The app is still fully usable in local-only mode. Add Supabase environment variables to enable sign-in,
              cloud persistence, and history tracking.
            </p>
          </div>
        ) : (
          <>
            <form className="auth-form" onSubmit={handleEmailSubmit}>
              <label className="auth-label" htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
              <button
                className={`auth-submit${submitMethod === 'email' ? ' is-loading' : ''}`}
                type="submit"
                disabled={submitMethod !== null}
              >
                {submitMethod === 'email' ? 'Sending…' : copy.button}
              </button>
            </form>

            <div className="auth-divider">
              <span>Or continue with Google</span>
            </div>

            <button
              className={`auth-google${submitMethod === 'google' ? ' is-loading' : ''}`}
              onClick={handleGoogleClick}
              disabled={submitMethod !== null}
            >
              <span className="auth-google-mark" aria-hidden="true">G</span>
              {submitMethod === 'google' ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {success && (
              <div className="auth-success" role="status">
                Check your email for the magic link. It will sign you in and sync your local progress.
              </div>
            )}

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
