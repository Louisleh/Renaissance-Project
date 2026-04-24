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

function reviewCountMilestone(threshold: number, id: string, title: string, copy: string): AchievementRule {
  return {
    id,
    title,
    copy,
    evaluate: ({ reviewLog }) => ({
      unlocked: reviewLog.length >= threshold,
      context: { review_count: reviewLog.length },
    }),
  };
}

function streakMilestone(days: number, id: string, title: string, copy: string): AchievementRule {
  return {
    id,
    title,
    copy,
    evaluate: ({ reviewLog, now }) => {
      const streak = computeStreak(reviewLog, now);
      return streak >= days ? { unlocked: true, context: { streak } } : { unlocked: false };
    },
  };
}

function synthesisMilestone(threshold: number, id: string, title: string, copy: string): AchievementRule {
  return {
    id,
    title,
    copy,
    evaluate: ({ states }) => {
      const snap = masterySnapshot(states);
      return snap.synthesis_index >= threshold
        ? { unlocked: true, context: { synthesis_index: snap.synthesis_index } }
        : { unlocked: false };
    },
  };
}

function coverageMilestone(threshold: number, id: string, title: string, copy: string): AchievementRule {
  return {
    id,
    title,
    copy,
    evaluate: ({ states }) => {
      const snap = masterySnapshot(states);
      return snap.overall_coverage >= threshold
        ? { unlocked: true, context: { coverage: snap.overall_coverage } }
        : { unlocked: false };
    },
  };
}

function domainFunctionalMilestone(threshold: number, count: number, id: string, title: string, copy: string): AchievementRule {
  return {
    id,
    title,
    copy,
    evaluate: ({ states }) => {
      const domains = perKnowledgeDomainMastery(states);
      const hits = domains.filter((d) => d.mastery >= threshold);
      return hits.length >= count
        ? { unlocked: true, context: { domains: hits.map((h) => h.domain) } }
        : { unlocked: false };
    },
  };
}

export const ACHIEVEMENT_RULES: AchievementRule[] = [
  // ── First steps ──
  reviewCountMilestone(1, 'first_review', 'First Card Reviewed', 'You opened the commonplace. Every serious practice begins here.'),
  reviewCountMilestone(50, 'reviews_50', 'Fifty Cards', 'Fifty reviews logged. The muscle is waking up.'),
  reviewCountMilestone(250, 'reviews_250', 'Two Hundred Fifty Cards', 'Quarter of the corpus cycled. Patterns are becoming visible.'),
  reviewCountMilestone(1000, 'reviews_1000', 'One Thousand Cards', 'Four-digit reviews. This is the habit of a year, compressed.'),
  reviewCountMilestone(5000, 'reviews_5000', 'Five Thousand Cards', 'You have reviewed more cards than most people will see in a lifetime.'),

  // ── Domain mastery ladder ──
  domainFunctionalMilestone(60, 1, 'domain_functional', 'First Functional Domain', 'One knowledge domain reached Functional mastery (≥60).'),
  domainFunctionalMilestone(60, 3, 'three_functional', 'Three Functional Domains', 'Three domains past the Functional threshold. The breadth is real.'),
  domainFunctionalMilestone(60, 6, 'six_functional', 'Six Functional Domains', 'Nearly half the map in solid standing.'),
  domainFunctionalMilestone(60, 13, 'all_functional', 'All Thirteen Functional', 'Every knowledge domain at Functional or above. Renaissance range.'),
  domainFunctionalMilestone(75, 1, 'domain_strong', 'First Strong Domain', 'One domain reached Strong mastery (≥75).'),
  domainFunctionalMilestone(75, 5, 'five_strong', 'Five Strong Domains', 'Five domains at Strong or above.'),
  domainFunctionalMilestone(90, 1, 'domain_signature', 'First Signature Domain', 'One domain reached Signature mastery (≥90).'),
  domainFunctionalMilestone(90, 3, 'three_signature', 'Three Signature Domains', 'Three domains mastered to signature level.'),

  // ── Synthesis index ladder ──
  synthesisMilestone(25, 'synthesis_25', 'Synthesis 25', 'Your cross-domain synthesis index crossed 25.'),
  synthesisMilestone(50, 'synthesis_50', 'Synthesis 50', 'Synthesis index at 50 — broad fluency across the map.'),
  synthesisMilestone(75, 'synthesis_75', 'Synthesis 75', 'Synthesis index at 75 — genuine cross-domain command.'),
  synthesisMilestone(90, 'synthesis_90', 'Synthesis 90', 'Synthesis index above 90. The integration is the message.'),

  // ── Coverage ──
  coverageMilestone(0.25, 'coverage_25', 'Quarter Coverage', 'A quarter of the corpus reviewed at least once.'),
  coverageMilestone(0.5, 'coverage_50', 'Half Coverage', 'Half the corpus reviewed at least once.'),
  coverageMilestone(0.9, 'coverage_90', 'Nine Tenths', 'Ninety percent of the corpus reviewed.'),

  // ── Retention ──
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
    id: 'retention_master',
    title: 'Retention Master',
    copy: 'At least 500 reviews overall with 90% retention across the set.',
    evaluate: ({ reviewLog }) => {
      if (reviewLog.length < 500) return { unlocked: false };
      const good = reviewLog.filter((e) => e.rating >= 3).length;
      return good / reviewLog.length >= 0.9
        ? { unlocked: true, context: { retention: good / reviewLog.length } }
        : { unlocked: false };
    },
  },

  // ── Breadth within a window ──
  {
    id: 'cross_domain_week',
    title: 'Breadth in a Week',
    copy: 'Reviewed cards across six or more domains within seven days.',
    evaluate: ({ reviewLog, now }) => {
      const domains = domainsTouchedInLastDays(reviewLog, now ?? new Date(), 7);
      return domains.size >= 6
        ? { unlocked: true, context: { domains: Array.from(domains) } }
        : { unlocked: false };
    },
  },
  {
    id: 'full_map_week',
    title: 'Full Map in a Week',
    copy: 'Reviewed cards across all thirteen domains within seven days.',
    evaluate: ({ reviewLog, now }) => {
      const domains = domainsTouchedInLastDays(reviewLog, now ?? new Date(), 7);
      return domains.size >= 13
        ? { unlocked: true, context: { domains: Array.from(domains) } }
        : { unlocked: false };
    },
  },
  {
    id: 'full_map_day',
    title: 'Full Map in a Day',
    copy: 'Reviewed cards across all thirteen domains within a single day.',
    evaluate: ({ reviewLog, now }) => {
      const domains = domainsTouchedInLastDays(reviewLog, now ?? new Date(), 1);
      return domains.size >= 13
        ? { unlocked: true, context: { domains: Array.from(domains) } }
        : { unlocked: false };
    },
  },

  // ── Streaks ──
  streakMilestone(3, 'streak_3', 'Three-Day Streak', 'Three consecutive days of study.'),
  streakMilestone(7, 'streak_7', 'Seven-Day Streak', 'Seven consecutive days of study.'),
  streakMilestone(14, 'streak_14', 'Fortnight Streak', 'Fourteen consecutive days.'),
  streakMilestone(30, 'streak_30', 'Thirty-Day Streak', 'Thirty consecutive days of study.'),
  streakMilestone(60, 'streak_60', 'Sixty-Day Streak', 'Sixty consecutive days of study.'),
  streakMilestone(100, 'streak_100', 'Hundred-Day Streak', 'A hundred consecutive days of study.'),
  streakMilestone(200, 'streak_200', 'Two-Hundred-Day Streak', 'Two hundred consecutive days — the habit is structural now.'),
  streakMilestone(365, 'streak_365', 'Year-Long Streak', 'A full year of unbroken daily study.'),

  // ── Session shape ──
  {
    id: 'heavy_session',
    title: 'Heavy Session',
    copy: 'Reviewed fifty or more cards in a single local day.',
    evaluate: ({ reviewLog, now }) => {
      const today = (now ?? new Date()).toISOString().slice(0, 10);
      const count = reviewLog.filter((e) => e.reviewed_at.slice(0, 10) === today).length;
      return count >= 50 ? { unlocked: true, context: { count } } : { unlocked: false };
    },
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    copy: 'Reviewed at least one card between midnight and five in the morning.',
    evaluate: ({ reviewLog }) => {
      const hit = reviewLog.find((e) => {
        const hour = new Date(e.reviewed_at).getHours();
        return hour >= 0 && hour < 5;
      });
      return hit ? { unlocked: true } : { unlocked: false };
    },
  },
  {
    id: 'dawn_reader',
    title: 'Dawn Reader',
    copy: 'Reviewed at least one card between five and seven in the morning.',
    evaluate: ({ reviewLog }) => {
      const hit = reviewLog.find((e) => {
        const hour = new Date(e.reviewed_at).getHours();
        return hour >= 5 && hour < 7;
      });
      return hit ? { unlocked: true } : { unlocked: false };
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
