import { createEmptyCard, fsrs, type Card as FsrsInternalCard, type Grade } from 'ts-fsrs';
import {
  CARD_SET_VERSION,
  type CardState,
  type FsrsCardState,
  type KnowledgeDomain,
  type Rating,
} from '../../types/cards';

const scheduler = fsrs();

function toInternal(state: CardState): FsrsInternalCard {
  return {
    due: new Date(state.due_at),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    learning_steps: 0,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  };
}

function fromInternal(
  cardId: string,
  domain: KnowledgeDomain,
  internal: FsrsInternalCard,
): CardState {
  return {
    card_id: cardId,
    card_set_version: CARD_SET_VERSION,
    domain,
    due_at: internal.due.toISOString(),
    stability: internal.stability,
    difficulty: internal.difficulty,
    elapsed_days: internal.elapsed_days,
    scheduled_days: internal.scheduled_days,
    reps: internal.reps,
    lapses: internal.lapses,
    state: internal.state as FsrsCardState,
    last_review: internal.last_review ? internal.last_review.toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

export function initialState(
  cardId: string,
  domain: KnowledgeDomain,
  now: Date = new Date(),
): CardState {
  const empty = createEmptyCard(now);
  return fromInternal(cardId, domain, empty);
}

export interface RateOutcome {
  nextState: CardState;
  prevStability: number;
  nextStability: number;
}

export function rate(state: CardState, rating: Rating, now: Date = new Date()): RateOutcome {
  const internal = toInternal(state);
  const result = scheduler.next(internal, now, rating as Grade);
  const nextState = fromInternal(state.card_id, state.domain, result.card);
  return {
    nextState,
    prevStability: state.stability,
    nextStability: result.card.stability,
  };
}

export function daysUntilDue(state: CardState, now: Date = new Date()): number {
  const dueMs = new Date(state.due_at).getTime();
  return (dueMs - now.getTime()) / (1000 * 60 * 60 * 24);
}

export function isDue(state: CardState, now: Date = new Date()): boolean {
  return daysUntilDue(state, now) <= 0;
}

export function isNew(state: CardState): boolean {
  return state.reps === 0 && state.last_review === null;
}
