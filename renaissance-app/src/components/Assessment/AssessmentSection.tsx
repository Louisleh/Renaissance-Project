import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import type { AssessmentMode } from '../../types';
import { assessmentModes } from '../../data/assessments';
import { trackCtaClick } from '../../lib/analytics';
import './AssessmentSection.css';

interface AssessmentSectionProps {
  currentMode: AssessmentMode;
  onSelectMode: (mode: AssessmentMode) => void;
  onStartQuickPulse: () => void;
  onStartDeepDive: () => void;
  onStartMirror: () => void;
}

export function AssessmentSection({
  currentMode,
  onSelectMode,
  onStartQuickPulse,
  onStartDeepDive,
  onStartMirror,
}: AssessmentSectionProps) {
  const { user } = useAuth();
  const { hasAccess, openPricing } = useSubscription();
  const current = assessmentModes[currentMode];

  const cards: {
    key: AssessmentMode;
    icon: ReactNode;
    meta: string;
    bestFor: string;
    why: string;
  }[] = [
    {
      key: 'quick',
      meta: '10 Questions • 3 Minutes',
      bestFor: 'Best for: a fast baseline before you commit time.',
      why: 'Why this mode: directional scoring that immediately ranks your weakest domains.',
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <path d="M12 3V12L18 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      key: 'deep',
      meta: 'Scenario-Based • High Accuracy',
      bestFor: 'Best for: people who want a more confident profile and sharper growth sequencing.',
      why: 'Why this mode: pressure-tested scenarios produce richer evidence and better archetype precision.',
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <path d="M5 4.5H19V19.5H5V4.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8H16M8 12H16M8 16H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: 'mirror',
      meta: 'Private LLM Workflow',
      bestFor: 'Best for: users who want the model to read their own conversation history privately.',
      why: 'Why this mode: you copy the prompt locally, run it in your own LLM, and paste back only the summary JSON.',
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <path d="M12 3C8 3 4.5 6 4.5 10C4.5 13.1 6.7 15.8 9.7 16.7L10.3 21L14 17.4H14.2C18.5 17.4 21.5 14.2 21.5 10C21.5 6 18 3 14 3H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 9H16M8 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section className="section" id="assessment">
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">Tri-Modal Assessment</div>
          <h2>Choose the depth, privacy model, and speed that matches your context.</h2>
          <p className="lede">
            Each pathway produces a profile, identifies weak domains, and feeds a tailored development sequence.
            Preview the mode below, then launch the one that fits your time and privacy needs.
          </p>
        </div>

        <div className="assessment-grid">
          {cards.map(card => {
            const mode = assessmentModes[card.key];
            const isSelected = card.key === currentMode;
            const isLocked = card.key === 'deep' && !hasAccess('deep_dive');
            const actionLabel = isLocked
              ? 'Preview Pro'
              : isSelected
                ? card.key === 'quick'
                  ? 'Start Quick Pulse'
                  : card.key === 'deep'
                    ? 'Start Deep Dive'
                    : 'Start LLM Mirror'
                : 'Select Mode';

            return (
              <article
                key={card.key}
                className={`assessment-card reveal${isSelected ? ' is-selected' : ''}`}
              >
                <div className="assessment-top">
                  <div className="assessment-icon" aria-hidden="true">{card.icon}</div>
                  <div className="assessment-meta">{card.meta}</div>
                </div>
                <div className="assessment-copy">
                  <h3>{mode.title}</h3>
                  <p>{mode.description}</p>
                </div>
                <div className="assessment-guidance">
                  <div><strong>Best for</strong><span>{card.bestFor}</span></div>
                  <div><strong>Why this mode</strong><span>{card.why}</span></div>
                </div>
                <div className="assessment-preview-note">The console below previews the selected mode before launch.</div>
                <div className="assessment-list">
                  {card.key === 'quick' && <>
                    <div>Rapid multiple-choice baseline</div>
                    <div>Best for first-time exploration</div>
                    <div>Instantly recommends a growth focus</div>
                  </>}
                  {card.key === 'deep' && <>
                    <div>Multi-scenario reasoning prompts</div>
                    <div>Higher confidence archetype assignment</div>
                    <div>Sharper curriculum sequencing</div>
                  </>}
                  {card.key === 'mirror' && <>
                    <div>No chat history sent to the platform</div>
                    <div>Paste back only the summary output</div>
                    <div>Designed for synthesis from real behavior</div>
                  </>}
                </div>
                <button
                  className={`assessment-button${isSelected ? ' is-active' : ''}`}
                  onClick={() => {
                    void trackCtaClick(`select_${card.key}`, 'assessment_section', user?.id ?? null);
                    onSelectMode(card.key);
                    if (card.key === 'quick') {
                      onStartQuickPulse();
                    }
                    if (card.key === 'deep') {
                      if (hasAccess('deep_dive')) {
                        onStartDeepDive();
                      } else {
                        openPricing();
                      }
                    }
                    if (card.key === 'mirror') {
                      onStartMirror();
                    }
                  }}
                >
                  {actionLabel}
                </button>
              </article>
            );
          })}
        </div>

        <div className="assessment-console reveal">
          <section className="console-card" aria-live="polite">
            <div className="console-kicker">Assessment Preview</div>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
            <div className="console-stats">
              <div className="console-stat">
                <strong>{current.duration}</strong>
                <span>Minutes</span>
              </div>
              <div className="console-stat">
                <strong>{current.signal}</strong>
                <span>Signal Type</span>
              </div>
              <div className="console-stat">
                <strong>{current.archetypeDisplay}</strong>
                <span>Likely Archetype</span>
              </div>
            </div>
            <div className="pill">{current.summary}</div>
          </section>
        </div>
      </div>
    </section>
  );
}
