import { loadStripe } from '@stripe/stripe-js';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import type { SubscriptionTier } from '../types';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripeProPriceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID as string | undefined;
const stripePremiumPriceId = import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID as string | undefined;
export const stripePricingTableId = (import.meta.env.VITE_STRIPE_PRICING_TABLE_ID as string | undefined) ?? null;
const calendlyUrl = import.meta.env.VITE_CALENDLY_URL as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;
export const isStripeConfigured = Boolean(stripePublicKey);
export const hasCheckoutConfig = Boolean(stripePublicKey && stripeProPriceId && stripePremiumPriceId);
export const configuredCalendlyUrl = calendlyUrl ?? null;

function getPriceId(tier: Exclude<SubscriptionTier, 'free'>): string | null {
  if (tier === 'pro') {
    return stripeProPriceId ?? null;
  }

  return stripePremiumPriceId ?? null;
}

async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase || !supabaseUrl) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    return { data: null, error: json.error || `Edge function returned ${res.status}` };
  }

  return { data: json, error: null };
}

export async function redirectToCheckout(
  tier: Exclude<SubscriptionTier, 'free'>,
  user: User | null
): Promise<{ error: Error | null }> {
  void user;
  const priceId = getPriceId(tier);

  if (!priceId || typeof window === 'undefined') {
    return { error: new Error('Stripe Checkout is not configured.') };
  }

  const { data, error } = await callEdgeFunction('create-checkout-session', {
    price_id: priceId,
    mode: 'subscription',
    success_url: `${window.location.origin}/profile?checkout=success`,
    cancel_url: `${window.location.origin}/pricing?checkout=cancelled`,
  });

  if (error || !data?.url) {
    return { error: new Error(error ?? 'Failed to create checkout session.') };
  }

  window.location.href = data.url as string;
  return { error: null };
}

export async function openCustomerPortal(): Promise<{ error: string | null }> {
  if (typeof window === 'undefined') {
    return { error: null };
  }

  // The edge function resolves the Stripe customer id from the caller's
  // JWT — never from a client-supplied argument — so this call needs no body.
  const { data, error } = await callEdgeFunction('create-portal-session', {});

  if (error || !data?.url) {
    return {
      error: error ?? 'Unable to open subscription management. Please contact support@renaissanceskills.com.',
    };
  }

  window.location.href = data.url as string;
  return { error: null };
}
