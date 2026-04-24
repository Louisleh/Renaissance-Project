import { useMemo } from 'react';
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain, type ReviewLogEntry } from '../../types/cards';

interface Props {
  reviewLog: ReviewLogEntry[];
  windowDays?: number;
}

interface Row {
  domain: KnowledgeDomain;
  total: number;
  success: number;
  retention: number | null;
}

export function RetentionGrid({ reviewLog, windowDays = 30 }: Props) {
  const rows: Row[] = useMemo(() => {
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const byDomain = new Map<KnowledgeDomain, { total: number; success: number }>();
    for (const entry of reviewLog) {
      if (new Date(entry.reviewed_at).getTime() < cutoff) continue;
      const r = byDomain.get(entry.domain) ?? { total: 0, success: 0 };
      r.total++;
      if (entry.rating >= 3) r.success++;
      byDomain.set(entry.domain, r);
    }
    return KNOWLEDGE_DOMAINS.map((domain) => {
      const data = byDomain.get(domain);
      return {
        domain,
        total: data?.total ?? 0,
        success: data?.success ?? 0,
        retention: data && data.total > 0 ? data.success / data.total : null,
      };
    });
  }, [reviewLog, windowDays]);

  return (
    <div className="retention-grid">
      {rows.map((row) => (
        <div key={row.domain} className="retention-tile">
          <span className="retention-domain">{row.domain}</span>
          {row.retention === null ? (
            <span className="retention-empty">No reviews yet</span>
          ) : (
            <>
              <div className="retention-bar" aria-hidden>
                <div
                  className="retention-bar-fill"
                  style={{ width: `${Math.round(row.retention * 100)}%` }}
                />
              </div>
              <span className="retention-meta">
                <span className="retention-pct">{Math.round(row.retention * 100)}%</span>
                <span className="retention-total">{row.total} reviews</span>
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
