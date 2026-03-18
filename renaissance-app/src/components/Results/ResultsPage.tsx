import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { trackCtaClick } from '../../lib/analytics';
import { RadarChart } from '../RadarChart/RadarChart';
import { UpgradeGate } from '../common/UpgradeGate';
import { generateProfileIntelligence } from '../../lib/profile-intelligence';
import { loadSavedResult } from '../QuickPulse/QuickPulseOverlay';
import moduleData from '../../data/quick-pulse-module.json';
import type { QuickPulseModule, AssessmentResult, ProfileIntelligence } from '../../types';
import './ResultsPage.css';

const qpData = moduleData as unknown as QuickPulseModule;

function getSummaryPreview(summary: string): string {
  const sentences = summary.split('. ');
  return sentences[0]?.endsWith('.') ? sentences[0] : `${sentences[0] ?? summary}.`;
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const { hasAccess } = useSubscription();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProfileIntelligence | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    const saved = loadSavedResult();
    if (saved?.scores) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(saved);
       
      setIntelligence(generateProfileIntelligence(saved));
    }
  }, [loading, user?.id]);

  if (!result || !intelligence) {
    return (
      <div className="results-empty">
        <div className="container">
          <h2>No Assessment Results Yet</h2>
          <p>Complete a Quick Pulse assessment to see your Renaissance profile.</p>
          <button className="hero-button" onClick={() => navigate('/')}>
            Go to Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="results-page" id="main-content">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Your Renaissance Profile</div>
          <h2>{result.archetype.label}</h2>
          <p className="lede">{result.archetype.description}</p>
          <p className="results-meta">
            Completed {new Date(result.completed_at).toLocaleDateString()} | Confidence: {Math.round(result.archetype.confidence * 100)}%
          </p>
        </div>

        {/* Profile Intelligence Narrative */}
        <div className="results-narrative">
          <h3>Profile Analysis</h3>
          <p>{hasAccess('full_intelligence') ? intelligence.narrative.summary : getSummaryPreview(intelligence.narrative.summary)}</p>
          {hasAccess('full_intelligence') ? (
            <div className="results-narrative-detail">
              <div>
                <h4>Archetype Rationale</h4>
                <p>{intelligence.archetype_breakdown.rationale}</p>
              </div>
              <div>
                <h4>Growth Priority</h4>
                <p>{intelligence.narrative.growth_priority}</p>
              </div>
            </div>
          ) : (
            <UpgradeGate feature="full_intelligence">
              <div className="results-narrative-detail">
                <div>
                  <h4>Archetype Rationale</h4>
                  <p>{intelligence.archetype_breakdown.rationale}</p>
                </div>
                <div>
                  <h4>Growth Priority</h4>
                  <p>{intelligence.narrative.growth_priority}</p>
                </div>
              </div>
            </UpgradeGate>
          )}
        </div>

        {/* Radar + Scores */}
        <div className="results-radar-section">
          <RadarChart
            labels={qpData.domains.map(d => d.label)}
            values={qpData.domains.map(d => result.scores[d.key])}
            showLabels={true}
            animated={true}
          />
          <div className="results-domain-list">
            {qpData.domains.map(d => (
              <div key={d.key} className="results-domain-row">
                <span className="results-domain-name">{d.label}</span>
                <div className="results-domain-bar-wrap">
                  <div className="results-domain-bar">
                    <div className="results-domain-fill" style={{ width: `${result.scores[d.key]}%` }} />
                  </div>
                </div>
                <span className="results-domain-score">{result.scores[d.key]}</span>
                <span className="results-domain-level">{result.levels[d.key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Balance */}
        <div className="results-balance">
          <div className="results-balance-num">{result.balance_index}</div>
          <div>
            <h4>Balance Index</h4>
            <p>{intelligence.balance_interpretation}</p>
            <p className="results-profile-type">Profile type: <strong>{intelligence.profile_type.replace('_', ' ')}</strong></p>
          </div>
        </div>

        {/* Curriculum */}
        <div className="results-curriculum">
          <h3>Recommended Development Sequence</h3>
          <div className="results-curriculum-list">
            {intelligence.curriculum.map(c => (
              <div key={c.domain} className="results-curriculum-item">
                <div className="results-curriculum-num">{c.order}</div>
                <div className="results-curriculum-content">
                  <h4>{c.module_name}</h4>
                  <span className="results-curriculum-domain">{c.domain_label}</span>
                  <p>{c.rationale}</p>
                  <span className="results-curriculum-time">{c.estimated_time}</span>
                </div>
                <span className={`qp-priority-badge qp-priority-${c.priority}`}>{c.priority}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="results-actions">
          <button
            className="hero-button"
            onClick={() => {
              void trackCtaClick('back_home', 'results_page', user?.id ?? null);
              navigate('/');
            }}
          >
            Back to Home
          </button>
          <button
            className="ghost-button"
            onClick={() => {
              void trackCtaClick('view_curriculum', 'results_page', user?.id ?? null);
              navigate('/curriculum');
            }}
          >
            View Curriculum
          </button>
        </div>
      </div>
    </main>
  );
}
