import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDueCards, type SessionPick } from '../../lib/srs/scheduler';
import { loadCardStates } from '../../lib/srs/card-state-store';
import { loadReviewLog } from '../../lib/srs/review-log';
import { ensureCardsLoaded } from '../../data/flashcards';
import { evaluateAchievements, type NewUnlock } from '../../lib/progression/achievements';
import { trackStudySessionStarted, trackStudySessionCompleted } from '../../lib/analytics';
import { perKnowledgeDomainMastery } from '../../lib/progression/mastery';
import type { CardState, KnowledgeDomain } from '../../types/cards';
import { SessionRunner, type SessionOutcome } from './SessionRunner';
import { SessionSummary } from './SessionSummary';
import { CommonplacePrompt } from './CommonplacePrompt';
import './StudyPage.css';

const DEFAULT_SESSION_SIZE = 20;

type Phase = 'loading' | 'preflight' | 'running' | 'summary';

function pickGrowthKnowledgeDomains(states: Record<string, CardState>): KnowledgeDomain[] {
  const masteries = perKnowledgeDomainMastery(states);
  const hasAnyProgress = masteries.some((m) => m.reviewedCount > 0);
  if (!hasAnyProgress) return [];
  return masteries
    .slice()
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)
    .map((d) => d.domain);
}

export function StudyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [queue, setQueue] = useState<SessionPick[]>([]);
  const [beforeStates, setBeforeStates] = useState<Record<string, CardState>>({});
  const [afterStates, setAfterStates] = useState<Record<string, CardState>>({});
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [unlocks, setUnlocks] = useState<NewUnlock[]>([]);

  const queueStats = useMemo(() => {
    const dueCount = queue.filter((p) => !p.isNew).length;
    const newCount = queue.filter((p) => p.isNew).length;
    return { dueCount, newCount, total: queue.length };
  }, [queue]);

  const buildQueue = useCallback(() => {
    const states = loadCardStates();
    const growthDomains = pickGrowthKnowledgeDomains(states);
    setBeforeStates(states);
    const picks = getDueCards(states, {
      limit: DEFAULT_SESSION_SIZE,
      growthDomains: growthDomains.length > 0 ? growthDomains : undefined,
    });
    setQueue(picks);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureCardsLoaded().then(() => {
      if (cancelled) return;
      buildQueue();
      setPhase('preflight');
    });
    return () => {
      cancelled = true;
    };
  }, [buildQueue]);

  useEffect(() => {
    if (phase !== 'preflight') return;
    const onFocus = () => buildQueue();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [buildQueue, phase]);

  const startSession = useCallback(() => {
    setAfterStates({});
    setOutcome(null);
    setUnlocks([]);
    setPhase('running');
    void trackStudySessionStarted(queueStats.dueCount, queueStats.total, 'study_page', user?.id ?? null);
  }, [queueStats, user?.id]);

  const handleStateChanged = useCallback((state: CardState) => {
    setAfterStates((prev) => ({ ...prev, [state.card_id]: state }));
  }, []);

  const finalize = useCallback(
    async (result: SessionOutcome) => {
      setOutcome(result);
      const latest = loadCardStates();
      setAfterStates(latest);
      const newUnlocks = await evaluateAchievements(
        {
          states: latest,
          reviewLog: loadReviewLog(),
          studyDays: [],
          now: new Date(),
        },
        user?.id ?? null,
      );
      setUnlocks(newUnlocks);
      void trackStudySessionCompleted(
        result.cardsReviewed,
        result.durationMs,
        result.retentionPct,
        result.domainsTouched,
        user?.id ?? null,
      );
      setPhase('summary');
    },
    [user?.id],
  );

  const handleComplete = useCallback(
    (result: SessionOutcome) => {
      void finalize(result);
    },
    [finalize],
  );

  const handleExit = useCallback(
    (partial: SessionOutcome) => {
      if (partial.cardsReviewed === 0) {
        setPhase('preflight');
        return;
      }
      void finalize(partial);
    },
    [finalize],
  );

  const handleStartAnother = useCallback(() => {
    buildQueue();
    setAfterStates({});
    setOutcome(null);
    setUnlocks([]);
    setPhase('preflight');
  }, [buildQueue]);

  if (phase === 'loading') {
    return (
      <main id="main-content" className="study-main">
        <div className="container study-preflight">
          <div className="study-preflight-card summary-card">
            <p className="study-preflight-hint">Loading cards…</p>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'running') {
    return (
      <main id="main-content" className="study-main">
        <SessionRunner
          queue={queue}
          userId={user?.id ?? null}
          onStateChanged={handleStateChanged}
          onComplete={handleComplete}
          onExit={handleExit}
        />
      </main>
    );
  }

  if (phase === 'summary' && outcome) {
    return (
      <main id="main-content" className="study-main">
        <SessionSummary
          outcome={outcome}
          beforeStates={beforeStates}
          afterStates={afterStates}
          newUnlocks={unlocks}
          onReturnHome={() => navigate('/')}
          onStartAnother={handleStartAnother}
        />
      </main>
    );
  }

  return (
    <main id="main-content" className="study-main">
      <div className="container study-preflight">
        <div className="study-preflight-card summary-card">
          <span className="study-preflight-eyebrow">Today</span>
          <h1 className="study-preflight-title">Study session</h1>
          <p className="study-preflight-lede">
            {queueStats.dueCount > 0
              ? `${queueStats.dueCount} cards due · ${queueStats.newCount} new to introduce`
              : `${queueStats.newCount} new cards ready · nothing overdue`}
          </p>
          <p className="study-preflight-hint">
            Rate each card honestly. The schedule improves when you say Again or Hard — stability grows from real
            retrieval, not fluency illusions. Shortcuts:{' '}
            <kbd>space</kbd> flips, <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd>/<kbd>4</kbd> rate.
          </p>
          <div className="study-preflight-actions">
            <button className="hero-button" onClick={startSession} type="button" disabled={queue.length === 0}>
              Start session
            </button>
            <button className="ghost-button" onClick={() => navigate('/journey')} type="button">
              Open the Journey
            </button>
          </div>
        </div>

        <CommonplacePrompt />
      </div>
    </main>
  );
}
