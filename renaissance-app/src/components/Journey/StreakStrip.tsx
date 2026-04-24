import { computeStreak, heatmap } from '../../lib/progression/streak';
import type { ReviewLogEntry } from '../../types/cards';

interface Props {
  reviewLog: ReviewLogEntry[];
}

function heatStep(count: number): number {
  if (count === 0) return 0;
  if (count < 5) return 1;
  if (count < 15) return 2;
  if (count < 30) return 3;
  return 4;
}

export function StreakStrip({ reviewLog }: Props) {
  const streak = computeStreak(reviewLog);
  const days = heatmap(reviewLog, new Date(), 49);
  return (
    <div className="journey-streak">
      <div className="journey-streak-head">
        <span className="journey-streak-label">Study streak</span>
        <span className="journey-streak-value">{streak}d</span>
      </div>
      <div className="journey-streak-heatmap" role="img" aria-label={`${days.length} day study heatmap`}>
        {days.map((d) => (
          <span
            key={d.day}
            className={`journey-streak-dot level-${heatStep(d.count)}`}
            title={`${d.day} — ${d.count} reviews`}
          />
        ))}
      </div>
    </div>
  );
}
