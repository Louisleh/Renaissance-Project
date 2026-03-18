import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { trackSignIn, trackSignOut } from '../lib/analytics';
import { syncOnSignIn } from '../lib/data-sync';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const PENDING_AUTH_METHOD_KEY = 'renaissance_pending_auth_method';

const defaultAuthState: AuthState = {
  user: null,
  session: null,
  loading: isSupabaseConfigured,
  signInWithEmail: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => undefined,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthState>(defaultAuthState);

function setPendingAuthMethod(method: 'email' | 'google'): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PENDING_AUTH_METHOD_KEY, method);
}

function consumePendingAuthMethod(user: User | null): 'email' | 'google' {
  if (typeof window !== 'undefined') {
    const pending = window.localStorage.getItem(PENDING_AUTH_METHOD_KEY);
    if (pending === 'email' || pending === 'google') {
      window.localStorage.removeItem(PENDING_AUTH_METHOD_KEY);
      return pending;
    }
  }

  return user?.app_metadata?.provider === 'google' ? 'google' : 'email';
}

function clearPendingAuthMethod(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PENDING_AUTH_METHOD_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let isActive = true;

    const applySession = async (nextSession: Session | null, shouldTrackSignIn: boolean) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await syncOnSignIn(nextSession.user.id);

        if (shouldTrackSignIn) {
          const method = consumePendingAuthMethod(nextSession.user);
          await trackSignIn(method, nextSession.user.id);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        await applySession(data.session, false);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        clearPendingAuthMethod();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void applySession(nextSession, event === 'SIGNED_IN');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    setPendingAuthMethod('email');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      clearPendingAuthMethod();
    }

    return { error };
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    setPendingAuthMethod('google');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      clearPendingAuthMethod();
    }

    return { error };
  };

  const signOut = async (): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const userId = user?.id ?? null;
    try {
      if (userId) {
        await trackSignOut(userId);
      }
    } finally {
      clearPendingAuthMethod();
      await supabase.auth.signOut();
    }
  };

  const value = useMemo<AuthState>(() => ({
    user,
    session,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    isAuthenticated: Boolean(user),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
