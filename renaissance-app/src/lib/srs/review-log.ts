import { isSupabaseConfigured, supabase } from '../supabase';
import type { KnowledgeDomain, Rating, ReviewLogEntry } from '../../types/cards';

export const REVIEW_LOG_KEY = 'renaissance_review_log';
const MAX_LOCAL_ENTRIES = 2000;

function readLocal(): ReviewLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_LOG_KEY);
    return raw ? (JSON.parse(raw) as ReviewLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: ReviewLogEntry[]): void {
  if (typeof window === 'undefined') return;
  const trimmed = entries.length > MAX_LOCAL_ENTRIES ? entries.slice(-MAX_LOCAL_ENTRIES) : entries;
  window.localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(trimmed));
}

function generateEntryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface AppendReviewInput {
  card_id: string;
  domain: KnowledgeDomain;
  rating: Rating;
  duration_ms: number;
  prev_stability: number | null;
  next_stability: number | null;
  reviewed_at?: string;
}

export async function appendReview(
  input: AppendReviewInput,
  userId: string | null,
): Promise<ReviewLogEntry> {
  const entry: ReviewLogEntry = {
    id: generateEntryId(),
    card_id: input.card_id,
    domain: input.domain,
    rating: input.rating,
    duration_ms: input.duration_ms,
    prev_stability: input.prev_stability,
    next_stability: input.next_stability,
    reviewed_at: input.reviewed_at ?? new Date().toISOString(),
    synced: false,
  };

  const entries = readLocal();
  entries.push(entry);
  writeLocal(entries);

  if (!isSupabaseConfigured || !supabase || !userId) return entry;

  const { error } = await supabase.from('card_reviews').insert({
    user_id: userId,
    card_id: entry.card_id,
    domain: entry.domain,
    rating: entry.rating,
    duration_ms: entry.duration_ms,
    prev_stability: entry.prev_stability,
    next_stability: entry.next_stability,
    reviewed_at: entry.reviewed_at,
  });

  if (!error) {
    const current = readLocal();
    const updated = current.map((e) => (e.id === entry.id ? { ...e, synced: true } : e));
    writeLocal(updated);
    entry.synced = true;
  }

  return entry;
}

export function loadReviewLog(): ReviewLogEntry[] {
  return readLocal();
}

export async function flushUnsyncedReviews(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const entries = readLocal();
  const unsynced = entries.filter((e) => !e.synced);
  if (unsynced.length === 0) return;

  const { error } = await supabase.from('card_reviews').insert(
    unsynced.map((e) => ({
      user_id: userId,
      card_id: e.card_id,
      domain: e.domain,
      rating: e.rating,
      duration_ms: e.duration_ms,
      prev_stability: e.prev_stability,
      next_stability: e.next_stability,
      reviewed_at: e.reviewed_at,
    })),
  );

  if (error) return;

  const synced = entries.map((e) => (!e.synced ? { ...e, synced: true } : e));
  writeLocal(synced);
}

export function clearLocalReviewLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REVIEW_LOG_KEY);
}
