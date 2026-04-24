import { useMemo } from 'react';
import type { ReviewLogEntry, KnowledgeDomain } from '../../types/cards';
import { KNOWLEDGE_DOMAINS } from '../../types/cards';

interface Props {
  reviewLog: ReviewLogEntry[];
  weeks?: number;
}

interface WeekBucket {
  weekStart: string;
  perDomain: Map<KnowledgeDomain, { total: number; success: number; stability: number }>;
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function addWeeks(start: Date, count: number): string {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + count * 7);
  return d.toISOString().slice(0, 10);
}

export function MasteryTrend({ reviewLog, weeks = 12 }: Props) {
  const series = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = weekKey(now.toISOString());
    const startDate = new Date(startOfThisWeek);
    startDate.setUTCDate(startDate.getUTCDate() - (weeks - 1) * 7);

    const buckets: WeekBucket[] = [];
    for (let i = 0; i < weeks; i++) {
      buckets.push({
        weekStart: addWeeks(startDate, i),
        perDomain: new Map(),
      });
    }

    for (const entry of reviewLog) {
      const key = weekKey(entry.reviewed_at);
      const bucket = buckets.find((b) => b.weekStart === key);
      if (!bucket) continue;
      const prev = bucket.perDomain.get(entry.domain) ?? { total: 0, success: 0, stability: 0 };
      prev.total += 1;
      if (entry.rating >= 3) prev.success += 1;
      if (entry.next_stability !== null) prev.stability = entry.next_stability;
      bucket.perDomain.set(entry.domain, prev);
    }

    return KNOWLEDGE_DOMAINS.map((domain) => {
      let carried = 0;
      const points = buckets.map((bucket) => {
        const data = bucket.perDomain.get(domain);
        if (data) carried = data.stability;
        return { weekStart: bucket.weekStart, value: carried, total: data?.total ?? 0 };
      });
      const touched = points.some((p) => p.total > 0);
      return { domain, points, touched };
    });
  }, [reviewLog, weeks]);

  const maxStability = Math.max(
    10,
    ...series.flatMap((s) => s.points.map((p) => p.value)),
  );

  const chartWidth = 640;
  const chartHeight = 160;
  const padding = 24;

  return (
    <div className="mastery-trend">
      <svg
        className="mastery-trend-svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        role="img"
        aria-label={`Per-domain mastery trend over ${weeks} weeks`}
      >
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="var(--border)"
          strokeWidth="0.5"
        />
        {series.map((s, i) => {
          if (!s.touched) return null;
          const stepX = (chartWidth - padding * 2) / Math.max(1, weeks - 1);
          const path = s.points
            .map((p, idx) => {
              const x = padding + idx * stepX;
              const y = chartHeight - padding - (p.value / maxStability) * (chartHeight - padding * 2);
              return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
          const hue = (i * 360) / KNOWLEDGE_DOMAINS.length;
          return (
            <path
              key={s.domain}
              d={path}
              fill="none"
              stroke={`hsl(${hue}, 45%, 62%)`}
              strokeWidth="1.3"
              opacity="0.85"
            />
          );
        })}
      </svg>
      <div className="mastery-trend-legend">
        {series
          .filter((s) => s.touched)
          .map((s, i) => {
            const origIndex = KNOWLEDGE_DOMAINS.indexOf(s.domain);
            const hue = (origIndex * 360) / KNOWLEDGE_DOMAINS.length;
            return (
              <span key={s.domain} className="mastery-trend-legend-item">
                <span className="mastery-trend-swatch" style={{ background: `hsl(${hue}, 45%, 62%)` }} />
                {s.domain}
              </span>
            );
          })}
        {series.every((s) => !s.touched) && (
          <span className="mastery-trend-empty">
            No review history yet. Complete a study session to seed the chart.
          </span>
        )}
      </div>
    </div>
  );
}
