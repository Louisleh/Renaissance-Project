import { loadStripe } from '@stripe/stripe-js';
import type { User } from '@supabase/supabase-js';
import type { SubscriptionTier } from '../types';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripeProPriceId = import.meta.env.VITE_STRIPE_PRO_PRICE_ID;
const stripePremiumPriceId = import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID;
export const stripePricingTableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID || null;
const calendlyUrl = import.meta.env.VITE_CALENDLY_URL;

export const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;
export const isStripeConfigured = Boolean(stripePublicKey);
export const hasCheckoutConfig = Boolean(stripePublicKey && stripeProPriceId && stripePremiumPriceId);
export const configuredCalendlyUrl = calendlyUrl || null;

function getPriceId(tier: Exclude<SubscriptionTier, 'free'>): string | null {
  if (tier === 'pro') {
    return stripeProPriceId || null;
  }

  return stripePremiumPriceId || null;
}

export async function redirectToCheckout(
  tier: Exclude<SubscriptionTier, 'free'>,
  user: User | null
): Promise<{ error: Error | null }> {
  const stripe = stripePromise ? await stripePromise : null;
  const priceId = getPriceId(tier);

  if (!stripe || !priceId || typeof window === 'undefined') {
    return { error: new Error('Stripe Checkout is not configured.') };
  }

  const result = await stripe.redirectToCheckout({
    mode: 'subscription',
    lineItems: [{ price: priceId, quantity: 1 }],
    successUrl: `${window.location.origin}/profile?checkout=success&tier=${tier}`,
    cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
    customerEmail: user?.email,
    clientReferenceId: user?.id,
  });

  return {
    error: result.error ?? null,
  };
}

export async function openCustomerPortal(customerId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  // TODO: replace this with a Supabase Edge Function that creates a Stripe Customer Portal session.
  window.alert(
    `Customer portal backend not configured yet for ${customerId}. Contact support@renaissanceskills.com to manage your subscription.`
  );
}
