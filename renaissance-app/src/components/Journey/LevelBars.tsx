import type { DomainMastery } from '../../lib/progression/mastery';

interface Props {
  masteries: DomainMastery[];
}

export function LevelBars({ masteries }: Props) {
  return (
    <div className="journey-levelbars">
      {masteries.map((m) => (
        <div key={m.domain} className="journey-levelbar">
          <div className="journey-levelbar-head">
            <span className="journey-levelbar-domain">{m.domain}</span>
            <span className="journey-levelbar-level">{m.level}</span>
          </div>
          <div className="journey-levelbar-track" aria-hidden>
            <div className="journey-levelbar-fill" style={{ width: `${m.mastery}%` }} />
          </div>
          <div className="journey-levelbar-meta">
            <span>{m.mastery}/100</span>
            <span>
              {m.reviewedCount}/{m.totalInDomain} reviewed
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
