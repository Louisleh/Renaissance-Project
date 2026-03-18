import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getSubscription, hasAccess as tierHasAccess } from '../lib/subscription';
import { isStripeConfigured } from '../lib/stripe';
import type { FeatureKey, SubscriptionState, SubscriptionTier } from '../types';

interface SubscriptionContextValue {
  subscription: SubscriptionState;
  tier: SubscriptionTier;
  loading: boolean;
  hasAccess: (feature: FeatureKey) => boolean;
  openPricing: () => void;
  isTrialEligible: boolean;
  refreshSubscription: () => Promise<void>;
}

const devUnlockedSubscription: SubscriptionState = {
  tier: 'premium',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
};

const freeSubscription: SubscriptionState = {
  tier: 'free',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: freeSubscription,
  tier: 'free',
  loading: false,
  hasAccess: () => false,
  openPricing: () => undefined,
  isTrialEligible: false,
  refreshSubscription: async () => undefined,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    return isStripeConfigured ? freeSubscription : devUnlockedSubscription;
  });
  const [loading, setLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!isStripeConfigured) {
      setSubscription(devUnlockedSubscription);
      setLoading(false);
      return;
    }

    if (!user?.id) {
      setSubscription(freeSubscription);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextSubscription = await getSubscription(user.id);
      setSubscription(nextSubscription);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refreshSubscription();
  }, [authLoading, refreshSubscription]);

  const openPricing = useCallback(() => {
    navigate('/pricing');
  }, [navigate]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    subscription,
    tier: subscription.tier,
    loading,
    hasAccess: (feature) => tierHasAccess(subscription.tier, feature),
    openPricing,
    isTrialEligible: subscription.tier === 'free',
    refreshSubscription,
  }), [loading, openPricing, refreshSubscription, subscription]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext);
}
