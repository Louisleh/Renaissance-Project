import { daysUntilDue, isNew } from './fsrs';
import { getAllCards, getCardById } from '../../data/flashcards';
import { isCardActive } from './card-flags';
import type { Card, CardState, KnowledgeDomain } from '../../types/cards';

type StatesMap = Record<string, CardState>;

export interface ScheduleOptions {
  limit?: number;
  now?: Date;
  growthDomains?: KnowledgeDomain[];
  maxSharePerDomain?: number;
  newCardRatio?: number;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_SHARE_PER_DOMAIN = 0.4;
const DEFAULT_NEW_RATIO = 0.3;
const LOW_COVERAGE_THRESHOLD = 0.3;
const LOW_COVERAGE_NEW_CAP = 3;

function shuffle<T>(arr: T[], seed: number): T[] {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dailySeed(now: Date): number {
  const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff;
  return h || 1;
}

export interface SessionPick {
  card: Card;
  state: CardState | null;
  isNew: boolean;
}

export function getDueCards(states: StatesMap, options: ScheduleOptions = {}): SessionPick[] {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const now = options.now ?? new Date();
  const maxShare = options.maxSharePerDomain ?? DEFAULT_MAX_SHARE_PER_DOMAIN;
  const newRatio = options.newCardRatio ?? DEFAULT_NEW_RATIO;
  const growthDomains = new Set(options.growthDomains ?? []);
  const maxPerDomain = Math.max(1, Math.ceil(limit * maxShare));

  const allCards = getAllCards();

  // Per-domain coverage: fraction of cards that have been reviewed at all.
  const totalsByDomain = new Map<KnowledgeDomain, number>();
  for (const card of allCards) {
    totalsByDomain.set(card.domain, (totalsByDomain.get(card.domain) ?? 0) + 1);
  }
  const reviewedByDomain = new Map<KnowledgeDomain, number>();
  for (const state of Object.values(states)) {
    if (isNew(state)) continue;
    reviewedByDomain.set(state.domain, (reviewedByDomain.get(state.domain) ?? 0) + 1);
  }
  const lowCoverageDomains = new Set<KnowledgeDomain>();
  for (const [domain, total] of totalsByDomain.entries()) {
    const reviewed = reviewedByDomain.get(domain) ?? 0;
    if (total === 0) continue;
    if (reviewed / total < LOW_COVERAGE_THRESHOLD) lowCoverageDomains.add(domain);
  }

  const dueStates: Array<{ state: CardState; card: Card }> = [];
  for (const state of Object.values(states)) {
    if (isNew(state)) continue;
    if (daysUntilDue(state, now) > 0) continue;
    if (!isCardActive(state.card_id, now)) continue;
    const card = getCardById(state.card_id);
    if (!card) continue;
    dueStates.push({ state, card });
  }
  dueStates.sort((a, b) => daysUntilDue(a.state, now) - daysUntilDue(b.state, now));

  const seen = new Set<string>();
  const domainCount = new Map<KnowledgeDomain, number>();
  const newDomainCount = new Map<KnowledgeDomain, number>();
  const picks: SessionPick[] = [];

  const tryAdd = (card: Card, state: CardState | null, newFlag: boolean): boolean => {
    if (picks.length >= limit) return false;
    if (seen.has(card.id)) return false;
    const current = domainCount.get(card.domain) ?? 0;
    if (current >= maxPerDomain) return false;
    if (newFlag && lowCoverageDomains.has(card.domain)) {
      const newCount = newDomainCount.get(card.domain) ?? 0;
      if (newCount >= LOW_COVERAGE_NEW_CAP) return false;
    }
    picks.push({ card, state, isNew: newFlag });
    seen.add(card.id);
    domainCount.set(card.domain, current + 1);
    if (newFlag) newDomainCount.set(card.domain, (newDomainCount.get(card.domain) ?? 0) + 1);
    return true;
  };

  for (const { state, card } of dueStates) {
    tryAdd(card, state, false);
    if (picks.length >= limit) return picks;
  }

  const seenIds = new Set(allCards.filter((c) => states[c.id] && !isNew(states[c.id])).map((c) => c.id));
  const newCards = allCards.filter((c) => !seenIds.has(c.id) && isCardActive(c.id, now));
  const seed = dailySeed(now);
  const shuffled = shuffle(newCards, seed);

  const growthFirst = shuffled.filter((c) => growthDomains.has(c.domain));
  const rest = shuffled.filter((c) => !growthDomains.has(c.domain));

  const newBudget = Math.max(1, Math.ceil(limit * newRatio));
  let newAdded = 0;
  for (const pool of [growthFirst, rest]) {
    for (const card of pool) {
      if (newAdded >= newBudget) break;
      if (picks.length >= limit) return picks;
      const added = tryAdd(card, null, true);
      if (added) newAdded++;
    }
  }

  for (const pool of [growthFirst, rest]) {
    for (const card of pool) {
      if (picks.length >= limit) return picks;
      tryAdd(card, null, true);
    }
  }

  return picks;
}

export function countDueCards(states: StatesMap, now: Date = new Date()): number {
  let count = 0;
  for (const state of Object.values(states)) {
    if (isNew(state)) continue;
    if (daysUntilDue(state, now) > 0) continue;
    if (!isCardActive(state.card_id, now)) continue;
    count++;
  }
  return count;
}
