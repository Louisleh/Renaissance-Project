export const DEFAULT_DAILY_CARDS = 20;
export const DEFAULT_DAILY_MINUTES = 25;
export const DEFAULT_WEEKLY_DOMAINS = 6;

export interface DailyGoal {
  daily_cards: number;
  daily_minutes: number;
  weekly_domain_breadth: number;
}

export function defaultDailyGoal(): DailyGoal {
  return {
    daily_cards: DEFAULT_DAILY_CARDS,
    daily_minutes: DEFAULT_DAILY_MINUTES,
    weekly_domain_breadth: DEFAULT_WEEKLY_DOMAINS,
  };
}

export function goalProgress(reviewed: number, target: number): number {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, reviewed / target));
}
