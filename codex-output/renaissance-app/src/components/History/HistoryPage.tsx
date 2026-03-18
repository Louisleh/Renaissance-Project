import { useEffect, useMemo, useState } from 'react';
import moduleData from '../../data/quick-pulse-module.json';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { loadAssessmentHistory } from '../../lib/data-sync';
import { UpgradeGate } from '../common/UpgradeGate';
import { RadarChart } from '../RadarChart/RadarChart';
import type { AssessmentHistoryEntry, DomainKey, QuickPulseModule } from '../../types';
import './HistoryPage.css';

const qpData = moduleData as unknown as QuickPulseModule;

const DOMAIN_STYLES: Array<{ color: string; dash: string }> = [
  { color: 'var(--gold)', dash: '0' },
  { color: 'var(--gold-strong)', dash: '6 4' },
  { color: 'var(--text)', dash: '0' },
  { color: 'var(--muted)', dash: '8 5' },
  { color: 'var(--gold)', dash: '2 6' },
  { color: 'var(--gold-strong)', dash: '10 4' },
  { color: 'var(--text)', dash: '4 4' },
  { color: 'var(--muted)', dash: '1 5' },
];

function formatAssessmentType(type: AssessmentHistoryEntry['type']): string {
  if (type === 'quick_pulse') {
    return 'Quick Pulse';
  }

  if (type === 'deep_dive') {
    return 'Deep Dive';
  }

  return 'LLM Mirror';
}

function LongitudinalChart({
  entries,
  activeDomains,
  onToggleDomain,
}: {
  entries: AssessmentHistoryEntry[];
  activeDomains: DomainKey[];
  onToggleDomain: (domain: DomainKey) => void;
}) {
  const width = 880;
  const height = 320;
  const paddingX = 56;
  const paddingTop = 24;
  const paddingBottom = 44;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const points = entries.map((entry, index) => ({
    entry,
    x: entries.length === 1 ? width / 2 : paddingX + (index / (entries.length - 1)) * plotWidth,
  }));

  const yForScore = (score: number) => paddingTop + ((100 - score) / 100) * plotHeight;

  return (
    <div className="hist-chart-shell">
      <svg className="hist-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Longitudinal domain score chart">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = yForScore(tick);
          return (
            <g key={tick}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
              />
              <text x={paddingX - 12} y={y} textAnchor="end" dominantBaseline="middle" className="hist-axis-label">
                {tick}
              </text>
            </g>
          );
        })}

        {activeDomains.map((domain) => {
          const domainIndex = qpData.domains.findIndex((item) => item.key === domain);
          const style = DOMAIN_STYLES[domainIndex % DOMAIN_STYLES.length];
          const polylinePoints = points
            .map(({ entry, x }) => `${x},${yForScore(entry.result.scores[domain])}`)
            .join(' ');

          return (
            <g key={domain}>
              <polyline
                fill="none"
                stroke={style.color}
                strokeWidth="3"
                strokeDasharray={style.dash}
                points={polylinePoints}
                opacity="0.95"
              />
              {points.map(({ entry, x }) => (
                <circle
                  key={`${domain}-${entry.id}`}
                  cx={x}
                  cy={yForScore(entry.result.scores[domain])}
                  r="4"
                  fill={style.color}
                />
              ))}
            </g>
          );
        })}

        {points.map(({ entry, x }) => (
          <text
            key={`label-${entry.id}`}
            x={x}
            y={height - 16}
            textAnchor="middle"
            className="hist-axis-label"
          >
            {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>

      <div className="hist-legend">
        {qpData.domains.map((domain, index) => {
          const isActive = activeDomains.includes(domain.key);
          const style = DOMAIN_STYLES[index % DOMAIN_STYLES.length];

          return (
            <button
              key={domain.key}
              className={`hist-legend-item${isActive ? ' is-active' : ''}`}
              onClick={() => onToggleDomain(domain.key)}
            >
              <span className="hist-legend-swatch" style={{ background: style.color }} />
              {domain.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HistoryPage() {
  const { user } = useAuth();
  const { hasAccess } = useSubscription();
  const [entries, setEntries] = useState<AssessmentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDomains, setActiveDomains] = useState<DomainKey[]>(() => qpData.domains.map((domain) => domain.key));

  useEffect(() => {
    if (!user?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadAssessmentHistory(user.id)
      .then((history) => {
        setEntries(history);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id]);

  const chartEntries = useMemo(() => {
    return [...entries].sort((left, right) => {
      return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    });
  }, [entries]);
  const visibleEntries = hasAccess('unlimited_history') ? entries : entries.slice(0, 2);
  const lockedEntries = hasAccess('unlimited_history') ? [] : entries.slice(2, 4);

  const toggleDomain = (domain: DomainKey) => {
    setActiveDomains((current) => {
      if (current.includes(domain)) {
        return current.length === 1 ? current : current.filter((item) => item !== domain);
      }

      return [...current, domain];
    });
  };

  return (
    <main className="hist-page" id="main-content">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Assessment History</div>
          <h1>Longitudinal profile tracking</h1>
          <p className="lede">
            Review every saved assessment, compare archetype shifts over time, and trace how each domain evolves as you
            move through the curriculum.
          </p>
        </div>

        {loading ? (
          <section className="hist-panel">
            <p>Loading your assessment history…</p>
          </section>
        ) : entries.length === 0 ? (
          <section className="hist-panel">
            <h2>No saved assessments yet.</h2>
            <p>Your historical view will appear here once you complete and sync at least one assessment.</p>
          </section>
        ) : (
          <>
            <div className="hist-list">
              {visibleEntries.map((entry) => (
                <article key={entry.id} className="hist-card">
                  <div className="hist-card-copy">
                    <div className="hist-card-kicker">
                      {formatAssessmentType(entry.type)} • {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                    <h2>{entry.result.archetype.label}</h2>
                    <p>
                      Confidence: {Math.round(entry.result.archetype.confidence * 100)}% • Balance: {entry.result.balance_index}
                    </p>
                    <div className="hist-strengths">
                      {entry.result.top_strengths.map((domain) => (
                        <span key={domain} className="hist-chip">
                          {qpData.domains.find((item) => item.key === domain)?.label ?? domain}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hist-card-chart">
                    <RadarChart
                      labels={qpData.domains.map((domain) => domain.label)}
                      values={qpData.domains.map((domain) => entry.result.scores[domain.key])}
                      showLabels={false}
                    />
                  </div>
                </article>
              ))}

              {!hasAccess('unlimited_history') && lockedEntries.length > 0 && (
                <UpgradeGate feature="unlimited_history">
                  <div className="hist-list">
                    {lockedEntries.map((entry) => (
                      <article key={entry.id} className="hist-card">
                        <div className="hist-card-copy">
                          <div className="hist-card-kicker">
                            {formatAssessmentType(entry.type)} • {new Date(entry.created_at).toLocaleDateString()}
                          </div>
                          <h2>{entry.result.archetype.label}</h2>
                          <p>Confidence: {Math.round(entry.result.archetype.confidence * 100)}% • Balance: {entry.result.balance_index}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </UpgradeGate>
              )}
            </div>

            {hasAccess('longitudinal_chart') ? (
              <section className="hist-panel">
                <div className="hist-card-kicker">Longitudinal View</div>
                <h2>Domain scores over time</h2>
                <p className="hist-panel-copy">
                  Toggle domains on and off to isolate changes in specific capabilities across Quick Pulse and Deep Dive sessions.
                </p>
                <LongitudinalChart
                  entries={chartEntries}
                  activeDomains={activeDomains}
                  onToggleDomain={toggleDomain}
                />
              </section>
            ) : (
              <UpgradeGate feature="longitudinal_chart">
                <section className="hist-panel">
                  <div className="hist-card-kicker">Longitudinal View</div>
                  <h2>Domain scores over time</h2>
                  <p className="hist-panel-copy">
                    Toggle domains on and off to isolate changes in specific capabilities across Quick Pulse and Deep Dive sessions.
                  </p>
                  <LongitudinalChart
                    entries={chartEntries}
                    activeDomains={activeDomains}
                    onToggleDomain={toggleDomain}
                  />
                </section>
              </UpgradeGate>
            )}
          </>
        )}
      </div>
    </main>
  );
}
