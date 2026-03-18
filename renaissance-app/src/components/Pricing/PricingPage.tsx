import { useEffect, useMemo, useState } from 'react';
import { AuthModal } from '../Auth/AuthModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { trackCtaClick } from '../../lib/analytics';
import {
  hasCheckoutConfig,
  isStripeConfigured,
  redirectToCheckout,
  stripePricingTableId,
} from '../../lib/stripe';
import type { SubscriptionTier } from '../../types';
import './PricingPage.css';

interface PlanCard {
  tier: SubscriptionTier;
  price: string;
  subtitle: string;
  features: string[];
  badge?: string;
}

const plans: PlanCard[] = [
  {
    tier: 'free',
    price: '$0',
    subtitle: 'Start mapping your profile',
    features: [
      'Quick Pulse assessment',
      'Basic results and archetype',
      'First lesson preview in every course',
      'Basic reading list',
    ],
  },
  {
    tier: 'pro',
    price: '$12/mo',
    subtitle: 'Full assessment + complete curriculum',
    badge: 'Most Popular',
    features: [
      'Everything in Free',
      'Deep Dive assessment',
      'Full curriculum access',
      'Unlimited history and tracking',
      'Curated reading with affiliate links',
      'Shareable profile card',
    ],
  },
  {
    tier: 'premium',
    price: '$29/mo',
    subtitle: 'Assessment + curriculum + 1-on-1 coaching',
    features: [
      'Everything in Pro',
      'Personalized reading order',
      '1-on-1 coaching access',
      'Priority support',
    ],
  },
];

function getButtonLabel(currentTier: SubscriptionTier, tier: SubscriptionTier): string {
  if (tier === 'free') {
    return currentTier === 'free' ? 'Current Plan' : 'Included';
  }

  if (currentTier === tier) {
    return 'Current Plan';
  }

  return 'Upgrade →';
}

export function PricingPage() {
  const { user, isAuthenticated } = useAuth();
  const { tier, subscription } = useSubscription();
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTier, setPendingTier] = useState<'pro' | 'premium' | null>(null);

  useEffect(() => {
    if (!stripePricingTableId || !isStripeConfigured || typeof document === 'undefined') {
      return;
    }

    const existing = document.querySelector('script[data-stripe-pricing-table]');
    if (existing) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://js.stripe.com/v3/pricing-table.js';
    script.dataset.stripePricingTable = 'true';
    document.body.appendChild(script);
  }, []);

  const statusCopy = useMemo(() => {
    if (!isStripeConfigured) {
      return 'Stripe is not configured in this environment. All premium features are unlocked for development.';
    }

    if (tier === 'free') {
      return 'All plans include unlimited Quick Pulse assessments. Cancel anytime.';
    }

    return subscription.current_period_end
      ? `Your ${tier} plan renews on ${new Date(subscription.current_period_end).toLocaleDateString()}.`
      : `You are currently on the ${tier} plan.`;
  }, [subscription.current_period_end, tier]);

  const handleUpgrade = async (targetTier: 'pro' | 'premium') => {
    setError(null);

    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }

    if (!hasCheckoutConfig) {
      setError('Stripe Checkout is not configured yet. Add the public key and price IDs to enable upgrades.');
      return;
    }

    setPendingTier(targetTier);
    void trackCtaClick(`upgrade_${targetTier}`, 'pricing_page', user?.id ?? null);

    const { error: checkoutError } = await redirectToCheckout(targetTier, user);
    if (checkoutError) {
      setError(checkoutError.message);
      setPendingTier(null);
      return;
    }
  };

  return (
    <main className="pricing-page" id="main-content">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Pricing</div>
          <h1>Invest in the Full Diagnostic</h1>
          <p className="lede">The free tier gives you a directional baseline. Pro unlocks scenario-based assessment, the complete 8-course curriculum, and longitudinal tracking.</p>
        </div>

        <p className="pricing-status">{statusCopy}</p>

        <div className="pricing-grid">
          {plans.map((plan) => {
            const isCurrent = !isStripeConfigured
              ? plan.tier === 'premium'
              : tier === plan.tier || (!isAuthenticated && plan.tier === 'free');
            const disabled = plan.tier === 'free' || isCurrent || !isStripeConfigured;

            return (
              <article
                key={plan.tier}
                className={`pricing-card pricing-card--${plan.tier}${plan.badge ? ' has-badge' : ''}${isCurrent ? ' is-current' : ''}`}
              >
                {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
                <div className="pricing-tier">{plan.tier}</div>
                <h2>{plan.price}</h2>
                <p className="pricing-subtitle">{plan.subtitle}</p>
                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  className={`pricing-button pricing-button--${plan.tier}`}
                  disabled={disabled || pendingTier === plan.tier}
                  onClick={() => {
                    if (plan.tier === 'pro' || plan.tier === 'premium') {
                      void handleUpgrade(plan.tier);
                    }
                  }}
                >
                  {pendingTier === plan.tier
                    ? 'Redirecting…'
                    : !isStripeConfigured && plan.tier !== 'free'
                      ? 'Unlocked in Dev'
                      : getButtonLabel(tier, plan.tier)}
                </button>
              </article>
            );
          })}
        </div>

        {error && <p className="pricing-error">{error}</p>}

        <div className="pricing-footnote">
          <span>All plans include unlimited Quick Pulse assessments.</span>
          <span>Cancel anytime • No long-term commitment.</span>
        </div>

        <section className="pricing-faq">
          <div className="eyebrow">FAQ</div>
          <h2>Common Questions</h2>
          <div className="pricing-faq-grid">
            <details className="pricing-faq-item">
              <summary>Can I retake assessments?</summary>
              <p>Unlimited. Each retake updates your skill graph and adjusts your curriculum sequence based on new scores.</p>
            </details>
            <details className="pricing-faq-item">
              <summary>What's the difference between Quick Pulse and Deep Dive?</summary>
              <p>Quick Pulse is 10 questions in 3 minutes for a directional baseline. Deep Dive uses scenario-based prompts over 18 minutes for higher-confidence scoring and sharper archetype assignment.</p>
            </details>
            <details className="pricing-faq-item">
              <summary>Is my data private?</summary>
              <p>Assessment results are stored locally by default. Sign in to sync across devices. The LLM Mirror never sends your chat history to our servers — only the summarized scores come back.</p>
            </details>
            <details className="pricing-faq-item">
              <summary>Can I cancel anytime?</summary>
              <p>Yes. No lock-in, no cancellation fee. Your assessment history stays accessible on the free tier.</p>
            </details>
          </div>
        </section>

        {stripePricingTableId && isStripeConfigured && (
          <section className="pricing-embed">
            <div className="pricing-embed-copy">
              <div className="eyebrow">Stripe Pricing Table</div>
              <h2>Alternate checkout surface</h2>
              <p className="pricing-status">
                If you prefer managing plans from Stripe Dashboard configuration, the pricing table below opens the same Stripe Checkout flow.
              </p>
            </div>
            <div
              className="pricing-embed-frame"
              dangerouslySetInnerHTML={{
                __html: `<stripe-pricing-table pricing-table-id="${stripePricingTableId}" publishable-key="${import.meta.env.VITE_STRIPE_PUBLIC_KEY}"${user?.email ? ` customer-email="${user.email}"` : ''}></stripe-pricing-table>`,
              }}
            />
          </section>
        )}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
