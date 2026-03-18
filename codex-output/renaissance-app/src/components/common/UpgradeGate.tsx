import type { ReactNode } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import type { FeatureKey } from '../../types';
import './UpgradeGate.css';

interface UpgradeGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}

function getFeatureCopy(feature: FeatureKey): { label: string; description: string } {
  switch (feature) {
    case 'deep_dive':
      return {
        label: 'Pro Feature',
        description: 'Unlock the Deep Dive assessment for richer scenario-based profiling.',
      };
    case 'full_curriculum':
      return {
        label: 'Pro Feature',
        description: 'Unlock the full lesson sequence and save progress across the entire curriculum.',
      };
    case 'full_intelligence':
      return {
        label: 'Pro Feature',
        description: 'Unlock the full profile analysis, rationale, and growth interpretation.',
      };
    case 'unlimited_history':
      return {
        label: 'Pro Feature',
        description: 'Unlock your full assessment archive and compare every historical result.',
      };
    case 'longitudinal_chart':
      return {
        label: 'Pro Feature',
        description: 'Unlock longitudinal score tracking and multi-assessment trend lines.',
      };
    case 'coaching':
      return {
        label: 'Premium Feature',
        description: 'Unlock 1-on-1 Renaissance coaching and guided development sessions.',
      };
    case 'personalized_reading':
      return {
        label: 'Premium Feature',
        description: 'Unlock personalized reading sequences ordered around your weakest domains.',
      };
    default:
      return {
        label: 'Upgrade Required',
        description: 'Unlock this premium layer to access the full Renaissance platform.',
      };
  }
}

export function UpgradeGate({ feature, children, fallback }: UpgradeGateProps) {
  const { hasAccess, openPricing } = useSubscription();

  if (hasAccess(feature)) {
    return <>{children}</>;
  }

  const copy = getFeatureCopy(feature);

  return (
    <div className="gate-shell">
      <div className="gate-preview" aria-hidden="true">
        {children}
      </div>
      <div className="gate-overlay">
        {fallback ?? (
          <div className="gate-card">
            <div className="gate-lock" aria-hidden="true">🔒</div>
            <div className="gate-kicker">{copy.label}</div>
            <h3>Unlock this layer</h3>
            <p>{copy.description}</p>
            <button className="hero-button" onClick={openPricing}>
              See Plans →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
