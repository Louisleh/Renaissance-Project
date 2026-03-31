import { useEffect, useState } from 'react';
import { archetypeInfo } from '../../data/assessments';
import type { ArchetypeKey } from '../../types';
import './ArchetypesSection.css';

interface ArchetypesSectionProps {
  activeArchetype: ArchetypeKey;
  onSelectArchetype?: (key: ArchetypeKey) => void;
}

export function ArchetypesSection({ activeArchetype, onSelectArchetype }: ArchetypesSectionProps) {
  const [spotlight, setSpotlight] = useState<ArchetypeKey>(activeArchetype);

  useEffect(() => {
    setSpotlight(activeArchetype);
  }, [activeArchetype]);

  const info = archetypeInfo[spotlight];
  const keys: ArchetypeKey[] = ['polymath', 'strategist', 'builder', 'leader'];

  const cardMeta: Record<ArchetypeKey, { desc: string; score: string }> = {
    polymath: { desc: 'Broad conceptual reach with unusually strong pattern transfer across domains.', score: 'High breadth \u2022 Strategic synthesis' },
    strategist: { desc: 'Sees systems, allocates effort well, and connects decisions to long-range leverage.', score: 'High foresight \u2022 Scenario fluency' },
    builder: { desc: 'Execution-heavy profile with strong technical momentum and tangible output capacity.', score: 'High execution \u2022 Technical force' },
    leader: { desc: 'Coordinates people, meaning, and adaptation under uncertainty with unusual clarity.', score: 'High influence \u2022 Adaptive range' },
  };

  return (
    <section className="section" id="archetypes">
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">Archetype Profiling</div>
          <h2>Four dominant operating modes for how broad capability turns into action.</h2>
          <p className="lede">
            Archetypes do not lock a user into identity. They simply name the strongest visible pattern so the platform can
            counterbalance it with deliberate synthesis training.
          </p>
        </div>

        <div className="archetype-grid">
          {keys.map(key => (
            <button
              key={key}
              className={`archetype-card reveal ${key === spotlight ? 'is-active' : ''}`}
              onClick={() => { setSpotlight(key); onSelectArchetype?.(key); }}
            >
              <span className="archetype-tag">{archetypeInfo[key].title}</span>
              <h3>{archetypeInfo[key].title}</h3>
              <p className="archetype-desc">{cardMeta[key].desc}</p>
              <div className="archetype-score">{cardMeta[key].score}</div>
            </button>
          ))}
        </div>

        <div className="spotlight-shell reveal" aria-live="polite">
          <section className="spotlight-card">
            <small>Archetype Spotlight</small>
            <h3>{info.title}</h3>
            <p>{info.description}</p>
          </section>
          <section className="spotlight-card">
            <small>Signature Strength</small>
            <strong>{info.strength}</strong>
            <p>{info.strengthCopy}</p>
          </section>
          <section className="spotlight-card">
            <small>Balancing Move</small>
            <strong>{info.balance}</strong>
            <p>{info.balanceCopy}</p>
          </section>
        </div>
      </div>
    </section>
  );
}
