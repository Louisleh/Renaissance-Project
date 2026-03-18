import { isSupabaseConfigured, supabase } from './supabase';
import type { FeatureKey, SubscriptionState, SubscriptionTier } from '../types';

export const featureMatrix: Record<FeatureKey, SubscriptionTier[]> = {
  deep_dive: ['pro', 'premium'],
  full_curriculum: ['pro', 'premium'],
  full_intelligence: ['pro', 'premium'],
  unlimited_history: ['pro', 'premium'],
  longitudinal_chart: ['pro', 'premium'],
  shareable_card: ['pro', 'premium'],
  curated_reading: ['pro', 'premium'],
  personalized_reading: ['premium'],
  coaching: ['premium'],
  priority_support: ['premium'],
};

const FREE_SUBSCRIPTION: SubscriptionState = {
  tier: 'free',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
};

const DEV_SUBSCRIPTION: SubscriptionState = {
  tier: 'premium',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
};

export async function getSubscription(userId: string): Promise<SubscriptionState> {
  if (!isSupabaseConfigured || !supabase) {
    return DEV_SUBSCRIPTION;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_period_end, cancel_at_period_end')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return FREE_SUBSCRIPTION;
  }

  return {
    tier: (data.subscription_tier as SubscriptionTier | null) ?? 'free',
    stripe_customer_id: typeof data.stripe_customer_id === 'string' ? data.stripe_customer_id : null,
    stripe_subscription_id: typeof data.stripe_subscription_id === 'string' ? data.stripe_subscription_id : null,
    current_period_end: typeof data.subscription_period_end === 'string' ? data.subscription_period_end : null,
    cancel_at_period_end: Boolean(data.cancel_at_period_end),
  };
}

export function hasAccess(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return featureMatrix[feature].includes(tier);
}

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'premium';
}
