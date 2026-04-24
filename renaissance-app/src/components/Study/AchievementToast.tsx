import type { NewUnlock } from '../../lib/progression/achievements';

interface Props {
  unlock: NewUnlock;
}

export function AchievementToast({ unlock }: Props) {
  return (
    <div className="achievement-toast">
      <span className="achievement-toast-eyebrow">Milestone</span>
      <span className="achievement-toast-title">{unlock.rule.title}</span>
      <span className="achievement-toast-copy">{unlock.rule.copy}</span>
    </div>
  );
}
