import { isSupabaseConfigured, supabase } from '../supabase';
import { computeStreak } from './streak';
import { masterySnapshot, perKnowledgeDomainMastery } from './mastery';
import { loadCommonplaceEntries } from './commonplace';
import type { CardState, ReviewLogEntry, StudyDay, KnowledgeDomain } from '../../types/cards';

export const UNLOCKED_ACHIEVEMENTS_KEY = 'renaissance_unlocked_achievements';

export interface MasteryContext {
  states: Record<string, CardState>;
  reviewLog: ReviewLogEntry[];
  studyDays: StudyDay[];
  now?: Date;
}

export interface AchievementRule {
  id: string;
  title: string;
  copy: string;
  evaluate: (ctx: MasteryContext) => { unlocked: boolean; context?: Record<string, unknown> };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function domainsTouchedInLastDays(reviewLog: ReviewLogEntry[], now: Date, days: number): Set<KnowledgeDomain> {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const set = new Set<KnowledgeDomain>();
  for (const entry of reviewLog) {
    if (new Date(entry.reviewed_at).getTime() >= cutoff) set.add(entry.domain);
  }
  return set;
}

function retentionByDomain(reviewLog: ReviewLogEntry[], domain: KnowledgeDomain): { total: number; success: number } {
  let total = 0;
  let success = 0;
  for (const entry of reviewLog) {
    if (entry.domain !== domain) continue;
    total++;
    if (entry.rating >= 3) success++;
  }
  return { total, success };
}

export const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: 'first_review',
    title: 'First Card Reviewed',
    copy: 'You opened the commonplace. Every serious practice begins here.',
    evaluate: ({ reviewLog }) => ({ unlocked: reviewLog.length >= 1 }),
  },
  {
    id: 'domain_functional',
    title: 'First Functional Domain',
    copy: 'One knowledge domain reached Functional mastery.',
    evaluate: ({ states }) => {
      const domains = perKnowledgeDomainMastery(states);
      const hit = domains.find((d) => d.mastery >= 60);
      return hit ? { unlocked: true, context: { domain: hit.domain, mastery: hit.mastery } } : { unlocked: false };
    },
  },
  {
    id: 'retention_scholar',
    title: 'Retention Scholar',
    copy: 'A domain with at least 100 reviewed cards and 85% retention.',
    evaluate: ({ reviewLog }) => {
      const byDomain = new Map<KnowledgeDomain, { total: number; success: number }>();
      for (const entry of reviewLog) {
        const r = byDomain.get(entry.domain) ?? { total: 0, success: 0 };
        r.total++;
        if (entry.rating >= 3) r.success++;
        byDomain.set(entry.domain, r);
      }
      for (const [domain, { total, success }] of byDomain.entries()) {
        if (total >= 100 && success / total >= 0.85) return { unlocked: true, context: { domain } };
      }
      return { unlocked: false };
    },
  },
  {
    id: 'synthesis_50',
    title: 'Synthesis 50',
    copy: 'Your cross-domain synthesis index crossed 50.',
    evaluate: ({ states }) => {
      const snap = masterySnapshot(states);
      return { unlocked: snap.synthesis_index >= 50, context: { synthesis_index: snap.synthesis_index } };
    },
  },
  {
    id: 'synthesis_75',
    title: 'Synthesis 75',
    copy: 'Your cross-domain synthesis index crossed 75.',
    evaluate: ({ states }) => {
      const snap = masterySnapshot(states);
      return { unlocked: snap.synthesis_index >= 75, context: { synthesis_index: snap.synthesis_index } };
    },
  },
  {
    id: 'cross_domain_week',
    title: 'Breadth in a Week',
    copy: 'Reviewed cards across six or more domains within seven days.',
    evaluate: ({ reviewLog, now }) => {
      const domains = domainsTouchedInLastDays(reviewLog, now ?? new Date(), 7);
      return { unlocked: domains.size >= 6, context: { domains: Array.from(domains) } };
    },
  },
  {
    id: 'streak_7',
    title: 'Seven-Day Streak',
    copy: 'Seven consecutive days of study.',
    evaluate: ({ reviewLog, now }) => {
      const streak = computeStreak(reviewLog, now);
      return { unlocked: streak >= 7, context: { streak } };
    },
  },
  {
    id: 'streak_30',
    title: 'Thirty-Day Streak',
    copy: 'Thirty consecutive days of study.',
    evaluate: ({ reviewLog, now }) => {
      const streak = computeStreak(reviewLog, now);
      return { unlocked: streak >= 30, context: { streak } };
    },
  },
  {
    id: 'streak_100',
    title: 'Hundred-Day Streak',
    copy: 'A hundred consecutive days of study.',
    evaluate: ({ reviewLog, now }) => {
      const streak = computeStreak(reviewLog, now);
      return { unlocked: streak >= 100, context: { streak } };
    },
  },
  {
    id: 'commonplace_streak_14',
    title: 'Commonplace Fourteen',
    copy: 'Fourteen daily reflection entries on consecutive days.',
    evaluate: ({ now }) => {
      const entries = loadCommonplaceEntries();
      if (entries.length < 14) return { unlocked: false };
      const keys = new Set(
        entries.map((e) => {
          const d = new Date(e.created_at);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }),
      );
      const today = now ?? new Date();
      const toKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cursor = new Date(today);
      let streak = 0;
      if (!keys.has(toKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (keys.has(toKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak >= 14 ? { unlocked: true, context: { streak } } : { unlocked: false };
    },
  },
];

interface UnlockedMap {
  [id: string]: { unlocked_at: string; context: Record<string, unknown> | null };
}

function readLocal(): UnlockedMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY);
    return raw ? (JSON.parse(raw) as UnlockedMap) : {};
  } catch {
    return {};
  }
}

function writeLocal(map: UnlockedMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify(map));
}

export function loadUnlockedAchievements(): UnlockedMap {
  return readLocal();
}

export interface NewUnlock {
  rule: AchievementRule;
  context: Record<string, unknown> | null;
}

export async function evaluateAchievements(
  ctx: MasteryContext,
  userId: string | null,
): Promise<NewUnlock[]> {
  const unlocked = readLocal();
  const newUnlocks: NewUnlock[] = [];

  for (const rule of ACHIEVEMENT_RULES) {
    if (unlocked[rule.id]) continue;
    const result = rule.evaluate(ctx);
    if (!result.unlocked) continue;
    unlocked[rule.id] = {
      unlocked_at: new Date().toISOString(),
      context: result.context ?? null,
    };
    newUnlocks.push({ rule, context: result.context ?? null });
  }

  if (newUnlocks.length > 0) {
    writeLocal(unlocked);
    if (isSupabaseConfigured && supabase && userId) {
      await supabase.from('user_achievements').upsert(
        newUnlocks.map((n) => ({
          user_id: userId,
          achievement_id: n.rule.id,
          unlocked_at: unlocked[n.rule.id].unlocked_at,
          context: n.context,
        })),
        { onConflict: 'user_id,achievement_id' },
      );
    }
  }

  return newUnlocks;
}

export function clearLocalAchievements(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(UNLOCKED_ACHIEVEMENTS_KEY);
}
