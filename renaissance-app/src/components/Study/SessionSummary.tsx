import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { CardState } from '../../types/cards';
import type { SessionOutcome } from './SessionRunner';
import { masterySnapshot, type DomainMastery } from '../../lib/progression/mastery';
import { computeStreak } from '../../lib/progression/streak';
import { loadReviewLog } from '../../lib/srs/review-log';
import type { NewUnlock } from '../../lib/progression/achievements';
import { AchievementToast } from './AchievementToast';

interface Props {
  outcome: SessionOutcome;
  beforeStates: Record<string, CardState>;
  afterStates: Record<string, CardState>;
  newUnlocks: NewUnlock[];
  onReturnHome: () => void;
  onStartAnother: () => void;
}

function formatMinutes(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes} min`;
}

interface MasteryDelta {
  domain: string;
  before: number;
  after: number;
  change: number;
}

function computeDeltas(before: DomainMastery[], after: DomainMastery[]): MasteryDelta[] {
  const byDomain = new Map(before.map((d) => [d.domain, d.mastery]));
  return after
    .map((d) => ({
      domain: d.domain,
      before: byDomain.get(d.domain) ?? 0,
      after: d.mastery,
      change: d.mastery - (byDomain.get(d.domain) ?? 0),
    }))
    .filter((d) => d.change !== 0)
    .sort((a, b) => b.change - a.change);
}

export function SessionSummary({
  outcome,
  beforeStates,
  afterStates,
  newUnlocks,
  onReturnHome,
  onStartAnother,
}: Props) {
  const snapshotBefore = useMemo(() => masterySnapshot(beforeStates), [beforeStates]);
  const snapshotAfter = useMemo(() => masterySnapshot(afterStates), [afterStates]);
  const deltas = useMemo(() => computeDeltas(snapshotBefore.domains, snapshotAfter.domains), [snapshotBefore, snapshotAfter]);
  const synthesisDelta = snapshotAfter.synthesis_index - snapshotBefore.synthesis_index;
  const streak = useMemo(() => computeStreak(loadReviewLog()), []);

  return (
    <div className="container study-summary">
      <div className="study-summary-card summary-card">
        <span className="study-summary-eyebrow">Session Complete</span>
        <h1 className="study-summary-title">Field notes</h1>
        <p className="study-summary-lede">
          {outcome.cardsReviewed} cards across {outcome.domainsTouched.length} domains in{' '}
          {formatMinutes(outcome.durationMs)}. Recall at {outcome.retentionPct}%.
        </p>

        <div className="study-summary-grid">
          <div className="study-summary-stat">
            <span className="study-summary-stat-label">Cards reviewed</span>
            <span className="study-summary-stat-value">{outcome.cardsReviewed}</span>
          </div>
          <div className="study-summary-stat">
            <span className="study-summary-stat-label">Retention</span>
            <span className="study-summary-stat-value">{outcome.retentionPct}%</span>
          </div>
          <div className="study-summary-stat">
            <span className="study-summary-stat-label">Current streak</span>
            <span className="study-summary-stat-value">{streak}d</span>
          </div>
          <div className="study-summary-stat">
            <span className="study-summary-stat-label">Synthesis index</span>
            <span className="study-summary-stat-value">
              {snapshotAfter.synthesis_index}
              {synthesisDelta !== 0 && (
                <span className={`study-summary-delta ${synthesisDelta > 0 ? 'is-up' : 'is-down'}`}>
                  {synthesisDelta > 0 ? '+' : ''}
                  {synthesisDelta}
                </span>
              )}
            </span>
          </div>
        </div>

        {deltas.length > 0 && (
          <div className="study-summary-section">
            <h2 className="study-summary-section-title">Mastery shifts</h2>
            <ul className="study-summary-deltas">
              {deltas.slice(0, 6).map((d) => (
                <li key={d.domain} className="study-summary-delta-row">
                  <span className="study-summary-delta-domain">{d.domain}</span>
                  <span className="study-summary-delta-bar">
                    <span className="study-summary-delta-bar-fill" style={{ width: `${d.after}%` }} />
                  </span>
                  <span className={`study-summary-delta-value ${d.change > 0 ? 'is-up' : 'is-down'}`}>
                    {d.change > 0 ? '+' : ''}
                    {d.change}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {newUnlocks.length > 0 && (
          <div className="study-summary-section">
            <h2 className="study-summary-section-title">New milestones</h2>
            <div className="study-summary-unlocks">
              {newUnlocks.map((u) => (
                <AchievementToast key={u.rule.id} unlock={u} />
              ))}
            </div>
          </div>
        )}

        <div className="study-summary-actions">
          <button className="hero-button" onClick={onStartAnother} type="button">
            Continue studying
          </button>
          <Link className="ghost-button" to="/journey">
            Open the Journey
          </Link>
          <button className="ghost-button" onClick={onReturnHome} type="button">
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
