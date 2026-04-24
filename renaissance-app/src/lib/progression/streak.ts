import type { ReviewLogEntry } from '../../types/cards';

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function subtractDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() - days);
  const y2 = base.getFullYear();
  const m2 = String(base.getMonth() + 1).padStart(2, '0');
  const d2 = String(base.getDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}

export function uniqueStudyDays(entries: ReviewLogEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) set.add(localDayKey(e.reviewed_at));
  return Array.from(set).sort();
}

export function computeStreak(entries: ReviewLogEntry[], now: Date = new Date()): number {
  if (entries.length === 0) return 0;
  const days = new Set(uniqueStudyDays(entries));
  const today = localDayKey(now.toISOString());
  let cursor = days.has(today) ? today : subtractDays(today, 1);
  if (!days.has(cursor)) return 0;
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = subtractDays(cursor, 1);
  }
  return count;
}

export interface StreakMilestone {
  days: number;
  label: string;
}

const MILESTONES: StreakMilestone[] = [
  { days: 7, label: 'One week' },
  { days: 30, label: 'One month' },
  { days: 100, label: 'Hundred days' },
  { days: 365, label: 'One year' },
];

export function crossedMilestones(prev: number, current: number): StreakMilestone[] {
  return MILESTONES.filter((m) => prev < m.days && current >= m.days);
}

export interface StudyDayHeat {
  day: string;
  count: number;
}

export function heatmap(entries: ReviewLogEntry[], now: Date = new Date(), days = 49): StudyDayHeat[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const k = localDayKey(e.reviewed_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const todayKey = localDayKey(now.toISOString());
  const result: StudyDayHeat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subtractDays(todayKey, i);
    result.push({ day: d, count: counts.get(d) ?? 0 });
  }
  return result;
}
