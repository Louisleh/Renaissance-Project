import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initialState, rate } from '../../lib/srs/fsrs';
import { saveCardState } from '../../lib/srs/card-state-store';
import { appendReview } from '../../lib/srs/review-log';
import { trackCardReviewed } from '../../lib/analytics';
import {
  RATING_AGAIN,
  RATING_EASY,
  RATING_GOOD,
  RATING_HARD,
  type CardState,
  type Rating,
} from '../../types/cards';
import type { Card, KnowledgeDomain } from '../../types/cards';
import type { SessionPick } from '../../lib/srs/scheduler';
import { CardRenderer } from './CardRenderer';

export interface SessionOutcome {
  cardsReviewed: number;
  durationMs: number;
  retentionPct: number;
  domainsTouched: KnowledgeDomain[];
  perDomainReviewCount: Record<string, number>;
}

interface Props {
  queue: SessionPick[];
  userId: string | null;
  onStateChanged: (state: CardState) => void;
  onComplete: (outcome: SessionOutcome) => void;
  onExit: (outcome: SessionOutcome) => void;
}

const RATING_OPTIONS: Array<{ rating: Rating; label: string; shortcut: string; description: string }> = [
  { rating: RATING_AGAIN, label: 'Again', shortcut: '1', description: 'Not yet — see it soon' },
  { rating: RATING_HARD, label: 'Hard', shortcut: '2', description: 'Retrieved with effort' },
  { rating: RATING_GOOD, label: 'Good', shortcut: '3', description: 'Correct and steady' },
  { rating: RATING_EASY, label: 'Easy', shortcut: '4', description: 'Effortless recall' },
];

export function SessionRunner({ queue, userId, onStateChanged, onComplete, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const sessionStart = useRef<number>(Date.now());
  const cardStart = useRef<number>(Date.now());
  const perDomain = useRef<Map<KnowledgeDomain, number>>(new Map());

  const pick: SessionPick | undefined = queue[index];
  const card: Card | undefined = pick?.card;

  const flip = useCallback(() => {
    if (!flipped) setFlipped(true);
  }, [flipped]);

  useEffect(() => {
    setFlipped(false);
    cardStart.current = Date.now();
  }, [index]);

  const buildOutcome = useCallback(
    (nextReviewed: number, nextSuccess: number): SessionOutcome => {
      const durationMs = Date.now() - sessionStart.current;
      const retentionPct = nextReviewed === 0 ? 0 : Math.round((nextSuccess / nextReviewed) * 100);
      const domainCounts: Record<string, number> = {};
      const domainsTouched: KnowledgeDomain[] = [];
      for (const [domain, count] of perDomain.current.entries()) {
        domainCounts[domain] = count;
        domainsTouched.push(domain);
      }
      return {
        cardsReviewed: nextReviewed,
        durationMs,
        retentionPct,
        domainsTouched,
        perDomainReviewCount: domainCounts,
      };
    },
    [],
  );

  const finish = useCallback(
    (nextReviewed: number, nextSuccess: number) => {
      onComplete(buildOutcome(nextReviewed, nextSuccess));
    },
    [buildOutcome, onComplete],
  );

  const handleExit = useCallback(() => {
    onExit(buildOutcome(reviewedCount, successCount));
  }, [buildOutcome, onExit, reviewedCount, successCount]);

  const submitRating = useCallback(
    async (rating: Rating) => {
      if (!pick || !card || !flipped || processing) return;
      setProcessing(true);
      const now = new Date();
      const baseState = pick.state ?? initialState(card.id, card.domain, now);
      const outcome = rate(baseState, rating, now);
      const nextState = outcome.nextState;
      const durationMs = Date.now() - cardStart.current;

      await Promise.all([
        saveCardState(nextState, userId),
        appendReview(
          {
            card_id: card.id,
            domain: card.domain,
            rating,
            duration_ms: durationMs,
            prev_stability: outcome.prevStability,
            next_stability: outcome.nextStability,
          },
          userId,
        ),
        trackCardReviewed(card.id, card.domain, rating, outcome.prevStability, outcome.nextStability, durationMs, userId),
      ]);

      onStateChanged(nextState);
      perDomain.current.set(card.domain, (perDomain.current.get(card.domain) ?? 0) + 1);
      const nextReviewed = reviewedCount + 1;
      const nextSuccess = successCount + (rating >= 3 ? 1 : 0);
      setReviewedCount(nextReviewed);
      setSuccessCount(nextSuccess);

      if (index + 1 >= queue.length) {
        setProcessing(false);
        finish(nextReviewed, nextSuccess);
        return;
      }
      setIndex(index + 1);
      setProcessing(false);
    },
    [pick, card, flipped, processing, userId, onStateChanged, index, queue.length, reviewedCount, successCount, finish],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        flip();
        return;
      }
      if (!flipped) return;
      if (event.key === '1') void submitRating(RATING_AGAIN);
      if (event.key === '2') void submitRating(RATING_HARD);
      if (event.key === '3') void submitRating(RATING_GOOD);
      if (event.key === '4') void submitRating(RATING_EASY);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flip, flipped, submitRating]);

  const progress = useMemo(() => {
    const denom = queue.length || 1;
    return Math.round(((index + (flipped ? 0.5 : 0)) / denom) * 100);
  }, [flipped, index, queue.length]);

  if (!pick || !card) {
    return null;
  }

  return (
    <div className="study-session">
      <div className="study-session-header">
        <button className="study-exit" onClick={handleExit} type="button">
          Leave session
        </button>
        <div className="study-progress">
          <span className="study-progress-label">{index + 1} / {queue.length}</span>
          <div className="study-progress-bar" aria-hidden>
            <div className="study-progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div
        className={`study-card ${flipped ? 'is-flipped' : ''} ${pick.isNew ? 'is-new' : ''}`}
        onClick={flip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            flip();
          }
        }}
      >
        <CardRenderer card={card} flipped={flipped} />
      </div>

      <div className="study-rating-bar" role="group" aria-label="Rate your recall">
        {RATING_OPTIONS.map((opt) => (
          <button
            key={opt.rating}
            className={`study-rating-btn study-rating-${opt.label.toLowerCase()}`}
            disabled={!flipped || processing}
            onClick={() => void submitRating(opt.rating)}
            type="button"
            aria-keyshortcuts={opt.shortcut}
          >
            <span className="study-rating-label">{opt.label}</span>
            <span className="study-rating-description">{opt.description}</span>
            <span className="study-rating-shortcut">{opt.shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
