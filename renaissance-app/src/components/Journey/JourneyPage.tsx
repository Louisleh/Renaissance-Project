import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadCardStates } from '../../lib/srs/card-state-store';
import { loadReviewLog } from '../../lib/srs/review-log';
import { ensureCardsLoaded } from '../../data/flashcards';
import { masterySnapshot } from '../../lib/progression/mastery';
import { countDueCards } from '../../lib/srs/scheduler';
import { computeStreak } from '../../lib/progression/streak';
import { loadUnlockedAchievements, ACHIEVEMENT_RULES } from '../../lib/progression/achievements';
import { trackJourneyViewed } from '../../lib/analytics';
import type { CardState, ReviewLogEntry } from '../../types/cards';
import { Constellation } from './Constellation';
import { LevelBars } from './LevelBars';
import { StreakStrip } from './StreakStrip';
import './JourneyPage.css';

export function JourneyPage() {
  const { user } = useAuth();
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [reviewLog, setReviewLog] = useState<ReviewLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setStates(loadCardStates());
    setReviewLog(loadReviewLog());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureCardsLoaded().then(() => {
      if (cancelled) return;
      refresh();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!ready) return;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [ready, refresh]);

  const unlocked = useMemo(() => loadUnlockedAchievements(), [reviewLog.length, states]);
  const snapshot = useMemo(() => masterySnapshot(states), [states]);
  const dueCount = useMemo(() => countDueCards(states), [states]);
  const streak = useMemo(() => computeStreak(reviewLog), [reviewLog]);

  useEffect(() => {
    if (!ready) return;
    const strongOrAbove = snapshot.domains.filter((d) => d.mastery >= 75).length;
    void trackJourneyViewed(snapshot.synthesis_index, strongOrAbove, user?.id ?? null);
  }, [ready, snapshot, user?.id]);

  if (!ready) {
    return (
      <main id="main-content" className="journey-main">
        <div className="container">
          <p style={{ color: 'var(--muted)' }}>Loading your journey…</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="journey-main">
      <section className="container journey-hero">
        <div className="journey-hero-text">
          <span className="journey-eyebrow">Your Journey</span>
          <h1 className="journey-title">Renaissance in progress</h1>
          <p className="journey-lede">
            The constellation below reflects every card you have ever reviewed. Ring thickness tracks mastery,
            lines are cross-domain connections present in your card set, and the synthesis index harmonizes
            across all thirteen knowledge domains.
          </p>
          <div className="journey-stats">
            <div className="journey-stat">
              <span className="journey-stat-label">Synthesis</span>
              <span className="journey-stat-value">{snapshot.synthesis_index}</span>
              <span className="journey-stat-sub">{snapshot.synthesis_level}</span>
            </div>
            <div className="journey-stat">
              <span className="journey-stat-label">Coverage</span>
              <span className="journey-stat-value">{Math.round(snapshot.overall_coverage * 100)}%</span>
              <span className="journey-stat-sub">{snapshot.total_reviewed} reviewed</span>
            </div>
            <div className="journey-stat">
              <span className="journey-stat-label">Streak</span>
              <span className="journey-stat-value">{streak}</span>
              <span className="journey-stat-sub">{streak === 1 ? 'day' : 'days'}</span>
            </div>
            <div className="journey-stat">
              <span className="journey-stat-label">Due today</span>
              <span className="journey-stat-value">{dueCount}</span>
              <Link className="journey-stat-cta" to="/study">
                Start →
              </Link>
            </div>
          </div>
        </div>

        <div className="journey-constellation-wrap">
          <Constellation masteries={snapshot.domains} />
        </div>
      </section>

      <section className="container journey-section">
        <StreakStrip reviewLog={reviewLog} />
      </section>

      <section className="container journey-section">
        <h2 className="journey-section-title">Knowledge domains</h2>
        <p className="journey-section-sub">
          Mastery is the harmonic weight of your stability values across cards you have reviewed in each domain,
          scaled by how much of the domain you have touched.
        </p>
        <LevelBars masteries={snapshot.domains} />
      </section>

      {Object.keys(unlocked).length > 0 && (
        <section className="container journey-section">
          <h2 className="journey-section-title">Milestones unlocked</h2>
          <ul className="journey-achievements">
            {ACHIEVEMENT_RULES.filter((r) => unlocked[r.id]).map((r) => (
              <li key={r.id} className="journey-achievement">
                <span className="journey-achievement-title">{r.title}</span>
                <span className="journey-achievement-copy">{r.copy}</span>
                <span className="journey-achievement-date">
                  {new Date(unlocked[r.id].unlocked_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
