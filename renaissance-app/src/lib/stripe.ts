import { loadStripe } from '@stripe/stripe-js';
import type { User } from '@supabase/supabase-js';
import type { SubscriptionTier } from '../types';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined;
const stripeProPriceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID as string | undefined;
const stripePremiumPriceId = import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID as string | undefined;
export const stripePricingTableId = (import.meta.env.VITE_STRIPE_PRICING_TABLE_ID as string | undefined) ?? null;
const calendlyUrl = import.meta.env.VITE_CALENDLY_URL as string | undefined;

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

export async function redirectToCheckout(
  tier: Exclude<SubscriptionTier, 'free'>,
  user: User | null
): Promise<{ error: Error | null }> {
  void user;
  const priceId = getPriceId(tier);

  if (!priceId || typeof window === 'undefined') {
    return { error: new Error('Stripe Checkout is not configured.') };
  }

  // Stripe v8+ no longer supports client-side redirectToCheckout.
  // In production, create a Checkout Session via a Supabase Edge Function
  // and redirect to the returned URL. For now, open a placeholder.
  const params = new URLSearchParams({
    price: priceId,
    mode: 'subscription',
  });
  window.location.href = `/api/create-checkout-session?${params.toString()}`;

  return { error: null };
}

export async function openCustomerPortal(customerId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  // TODO: replace this with a Supabase Edge Function that creates a Stripe Customer Portal session.
  void customerId;
  window.alert(
    'Subscription management is launching soon. For immediate changes, contact support@renaissanceskills.com.'
  );
}
