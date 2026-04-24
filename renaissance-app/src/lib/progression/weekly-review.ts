import { loadCommonplaceEntries } from './commonplace';
import { loadReviewLog } from '../srs/review-log';
import { loadCardStates } from '../srs/card-state-store';
import { getCardById } from '../../data/flashcards';
import { computeStreak } from './streak';
import { masterySnapshot, type DomainMastery } from './mastery';
import type { Card, CardState, CommonplaceEntry, KnowledgeDomain, ReviewLogEntry } from '../../types/cards';

export const WEEKLY_REVIEW_STATE_KEY = 'renaissance_weekly_review_state';

interface WeeklyReviewState {
  last_completed_iso_week: string;
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function readState(): WeeklyReviewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WEEKLY_REVIEW_STATE_KEY);
    return raw ? (JSON.parse(raw) as WeeklyReviewState) : null;
  } catch {
    return null;
  }
}

function writeState(state: WeeklyReviewState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WEEKLY_REVIEW_STATE_KEY, JSON.stringify(state));
}

export function weeklyReviewAvailable(now: Date = new Date()): boolean {
  const dow = now.getDay(); // 0=Sunday, 6=Saturday
  if (dow !== 0 && dow !== 6) return false;
  const state = readState();
  return state?.last_completed_iso_week !== isoWeekKey(now);
}

export function markWeeklyReviewComplete(now: Date = new Date()): void {
  writeState({ last_completed_iso_week: isoWeekKey(now) });
}

export interface WeeklyReviewSummary {
  now: Date;
  weekStart: Date;
  cardsReviewed: number;
  retentionPct: number | null;
  domainsTouched: KnowledgeDomain[];
  streak: number;
  commonplaceEntries: CommonplaceEntry[];
  topDomains: DomainMastery[];
  strugglingDomains: DomainMastery[];
  resurfacedCards: Card[];
}

function startOfLastWeek(now: Date): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday - 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pickResurfacedCards(
  reviewLog: ReviewLogEntry[],
  weekStart: Date,
  states: Record<string, CardState>,
): Card[] {
  const cutoff = weekStart.getTime();
  const seen = new Map<string, { rating: number; stability: number | null }>();
  for (const entry of reviewLog) {
    if (new Date(entry.reviewed_at).getTime() < cutoff) continue;
    seen.set(entry.card_id, {
      rating: entry.rating,
      stability: entry.next_stability,
    });
  }
  const candidates = Array.from(seen.entries())
    .filter(([, info]) => info.rating <= 2)
    .sort((a, b) => (a[1].stability ?? 0) - (b[1].stability ?? 0))
    .slice(0, 5)
    .map(([id]) => getCardById(id))
    .filter((c): c is Card => Boolean(c));
  if (candidates.length >= 3) return candidates;

  const fallback = Object.values(states)
    .filter((s) => s.last_review && new Date(s.last_review).getTime() >= cutoff)
    .sort((a, b) => (a.stability - b.stability))
    .slice(0, 5 - candidates.length)
    .map((s) => getCardById(s.card_id))
    .filter((c): c is Card => Boolean(c));

  const merged: Card[] = [];
  const seenIds = new Set<string>();
  for (const c of [...candidates, ...fallback]) {
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);
    merged.push(c);
  }
  return merged;
}

export function computeWeeklySummary(now: Date = new Date()): WeeklyReviewSummary {
  const reviewLog = loadReviewLog();
  const states = loadCardStates();
  const commonplace = loadCommonplaceEntries();
  const weekStart = startOfLastWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const thisWeeksReviews = reviewLog.filter((e) => {
    const t = new Date(e.reviewed_at).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  });

  const cardsReviewed = thisWeeksReviews.length;
  const good = thisWeeksReviews.filter((e) => e.rating >= 3).length;
  const retentionPct = cardsReviewed === 0 ? null : Math.round((good / cardsReviewed) * 100);

  const domains = new Set<KnowledgeDomain>();
  for (const e of thisWeeksReviews) domains.add(e.domain);

  const weeksCommonplace = commonplace.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  });

  const snapshot = masterySnapshot(states);
  const topDomains = snapshot.domains.slice().sort((a, b) => b.mastery - a.mastery).slice(0, 3);
  const strugglingDomains = snapshot.domains
    .slice()
    .filter((d) => d.reviewedCount > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);

  const resurfacedCards = pickResurfacedCards(reviewLog, weekStart, states);

  return {
    now,
    weekStart,
    cardsReviewed,
    retentionPct,
    domainsTouched: Array.from(domains),
    streak: computeStreak(reviewLog, now),
    commonplaceEntries: weeksCommonplace,
    topDomains,
    strugglingDomains,
    resurfacedCards,
  };
}
