import { useMemo, useState } from 'react';
import type { CommonplaceEntry } from '../../types/cards';

interface Props {
  entries: CommonplaceEntry[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CommonplaceHistory({ entries }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ordered = useMemo(
    () => entries.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((e) =>
      [e.prompt_text, e.body, e.domain_hint ?? ''].some((s) => s.toLowerCase().includes(q)),
    );
  }, [ordered, query]);

  if (entries.length === 0) {
    return (
      <div className="commonplace-history commonplace-history-empty">
        <p>
          When you answer the daily commonplace prompt on the study screen, it lands here. Think of it as the
          private log of how your reasoning evolved.
        </p>
      </div>
    );
  }

  return (
    <div className="commonplace-history">
      <div className="commonplace-history-head">
        <input
          className="commonplace-history-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${entries.length} entries…`}
          aria-label="Search commonplace entries"
        />
        <span className="commonplace-history-count">
          {filtered.length} / {entries.length}
        </span>
      </div>
      <ul className="commonplace-history-list">
        {filtered.map((entry) => {
          const long = entry.body.length > 240;
          const showFull = expanded[entry.id] ?? false;
          return (
            <li key={entry.id} className="commonplace-history-item">
              <div className="commonplace-history-meta">
                <span className="commonplace-history-date">{formatDate(entry.created_at)}</span>
                {entry.domain_hint && (
                  <span className="commonplace-history-domain">{entry.domain_hint}</span>
                )}
              </div>
              <p className="commonplace-history-prompt">{entry.prompt_text}</p>
              <p className="commonplace-history-body">
                {long && !showFull ? `${entry.body.slice(0, 240).trimEnd()}…` : entry.body}
              </p>
              {long && (
                <button
                  type="button"
                  className="commonplace-history-toggle"
                  onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !showFull }))}
                >
                  {showFull ? 'Collapse' : 'Read more'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
