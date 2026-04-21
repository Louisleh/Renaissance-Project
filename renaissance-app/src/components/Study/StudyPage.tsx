import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getDueCards, type SessionPick } from '../../lib/srs/scheduler';
import { loadCardStates } from '../../lib/srs/card-state-store';
import { loadReviewLog } from '../../lib/srs/review-log';
import { evaluateAchievements, type NewUnlock } from '../../lib/progression/achievements';
import { trackStudySessionStarted, trackStudySessionCompleted } from '../../lib/analytics';
import { perKnowledgeDomainMastery } from '../../lib/progression/mastery';
import type { CardState, KnowledgeDomain } from '../../types/cards';
import { SessionRunner, type SessionOutcome } from './SessionRunner';
import { SessionSummary } from './SessionSummary';
import { CommonplacePrompt } from './CommonplacePrompt';
import './StudyPage.css';

const DEFAULT_SESSION_SIZE = 20;

type Phase = 'preflight' | 'running' | 'summary';

function pickGrowthKnowledgeDomains(states: Record<string, CardState>): KnowledgeDomain[] {
  const masteries = perKnowledgeDomainMastery(states);
  return masteries
    .slice()
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)
    .map((d) => d.domain);
}

export function StudyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('preflight');
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
    buildQueue();
  }, [buildQueue]);

  const startSession = useCallback(() => {
    setPhase('running');
    void trackStudySessionStarted(queueStats.dueCount, queueStats.total, 'study_page', user?.id ?? null);
  }, [queueStats, user?.id]);

  const handleStateChanged = useCallback((state: CardState) => {
    setAfterStates((prev) => ({ ...prev, [state.card_id]: state }));
  }, []);

  const handleComplete = useCallback(
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

  const handleStartAnother = useCallback(() => {
    buildQueue();
    setAfterStates({});
    setOutcome(null);
    setUnlocks([]);
    setPhase('preflight');
  }, [buildQueue]);

  const handleExitSession = useCallback(() => {
    if (Object.keys(afterStates).length > 0) {
      void handleComplete({
        cardsReviewed: Object.keys(afterStates).length,
        durationMs: 0,
        retentionPct: 0,
        domainsTouched: [],
        perDomainReviewCount: {},
      });
      return;
    }
    setPhase('preflight');
  }, [afterStates, handleComplete]);

  if (phase === 'running') {
    return (
      <main id="main-content" className="study-main">
        <SessionRunner
          queue={queue}
          userId={user?.id ?? null}
          onStateChanged={handleStateChanged}
          onComplete={(result) => void handleComplete(result)}
          onExit={handleExitSession}
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
            retrieval, not fluency illusions.
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
