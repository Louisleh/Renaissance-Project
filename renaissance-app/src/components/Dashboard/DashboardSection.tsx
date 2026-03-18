import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { trackCtaClick } from '../../lib/analytics';
import { ReadingSection } from '../Reading/ReadingSection';
import type { AssessmentModeConfig } from '../../types';
import './DashboardSection.css';

interface DashboardSectionProps {
  assessment: AssessmentModeConfig;
  balanceIndex: number;
  weakestDomains: string[];
}

export function DashboardSection({ assessment, balanceIndex, weakestDomains }: DashboardSectionProps) {
  const [tab, setTab] = useState<'growth' | 'path'>('growth');
  const { user } = useAuth();
  const { hasAccess } = useSubscription();

  const strongest = Object.entries(assessment.profile)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  const highlightedSkills = [...weakestDomains, strongest].slice(0, 4);

  return (
    <section className="section" id="development">
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">Development & Curriculum</div>
          <h2>Translate the assessment into targeted growth and a sequenced synthesis roadmap.</h2>
          <p className="lede">
            The dashboard below simulates what users see after profiling: weak areas become visible, micro-courses are prioritized,
            and a cross-domain order of operations turns breadth into durable capability.
          </p>
        </div>

        <div className="dashboard-shell">
          <aside className="summary-card reveal" aria-live="polite">
            <div className="console-kicker">Post-Assessment Dashboard</div>
            <h3>{assessment.shortTitle} Summary</h3>
            <p>{assessment.description}</p>
            <div className="balance-value">{balanceIndex}</div>
            <div className="pill">
              Balance Index {'\u2022'} {balanceIndex >= 75 ? 'Strong breadth with manageable gaps' : 'Moderate asymmetry with high upside'}
            </div>
            <div className="scorebars">
              {highlightedSkills.map(skill => {
                const value = assessment.profile[skill] ?? 0;
                return (
                  <div key={skill} className="scorebar">
                    <div className="scorebar-head">
                      <span>{skill}</span>
                      <strong>{value}</strong>
                    </div>
                    <div className="scorebar-track">
                      <div className="scorebar-fill" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="console-kicker">Priority Domains</div>
              <div className="weakness-list">
                {weakestDomains.map(s => <span key={s} className="weakness-chip">{s}</span>)}
              </div>
            </div>
          </aside>

          <div className="dashboard-main">
            <div className="tab-row reveal">
              <button className={`tab-button ${tab === 'growth' ? 'is-active' : ''}`} onClick={() => setTab('growth')}>
                Targeted Growth
              </button>
              <button className={`tab-button ${tab === 'path' ? 'is-active' : ''}`} onClick={() => setTab('path')}>
                AI-Optimized Synthesis Path
              </button>
            </div>

            <div className="panel-stack">
              {tab === 'growth' && (
                <section className="panel is-active reveal" aria-live="polite">
                  <div className="growth-grid">
                    {assessment.growth.map((item, i) => (
                      <article key={i} className="growth-card">
                        <div className="growth-meta">{item.meta}</div>
                        <h3>{item.title}</h3>
                        <p>{item.copy}</p>
                        <div className="growth-foot">{item.foot}</div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {tab === 'path' && (
                <section className="panel is-active reveal" aria-live="polite">
                  <div className="timeline-grid">
                    {assessment.path.map((item, i) => (
                      <article key={i} className="timeline-card">
                        <div className="timeline-index">
                          <strong>0{i + 1}</strong>
                          <span className="timeline-phase">{item.phase}</span>
                        </div>
                        <div className="timeline-content">
                          <h3>{item.title}</h3>
                          <p>{item.copy}</p>
                          <div className="timeline-foot">{item.foot}</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="future-grid reveal">
              <section className="future-card">
                <ReadingSection
                  title="Recommended Reading"
                  description="Use books to deepen the weakest parts of your profile and widen the pattern library you bring into future assessments."
                  maxItems={4}
                />
              </section>
              <section className="future-card">
                <div className="console-kicker">1-on-1 Coaching</div>
                <h3>Coaching Layer</h3>
                <p>
                  Premium coaching turns your assessment and curriculum into a concrete 30-day execution loop with
                  external accountability.
                </p>
                <Link
                  className="ghost-button cur-dashboard-link"
                  to={hasAccess('coaching') ? '/coaching' : '/pricing'}
                  onClick={() => {
                    void trackCtaClick('open_coaching', 'dashboard_section', user?.id ?? null);
                  }}
                >
                  {hasAccess('coaching') ? 'Book Coaching' : 'Unlock Coaching'}
                </Link>
                <div className="cur-dashboard-support">{assessment.coaching}</div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
