import type { Card } from '../../types/cards';

interface Props {
  card: Card;
  flipped: boolean;
}

export function CardRenderer({ card, flipped }: Props) {
  switch (card.type) {
    case 'standard':
      return <StandardCard card={card} flipped={flipped} />;
    case 'connection':
      return <ConnectionCard card={card} flipped={flipped} />;
    case 'application':
      return <ApplicationCard card={card} flipped={flipped} />;
    case 'synthesis':
      return <SynthesisCard card={card} flipped={flipped} />;
    case 'scenario':
      return <ScenarioCard card={card} flipped={flipped} />;
  }
}

function FaceFront({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="study-card-face study-card-front">
      <span className="study-card-tag">{label}</span>
      {children}
    </div>
  );
}

function FaceBack({ children }: { children: React.ReactNode }) {
  return <div className="study-card-face study-card-back">{children}</div>;
}

function StandardCard({ card, flipped }: { card: Extract<Card, { type: 'standard' }>; flipped: boolean }) {
  return (
    <>
      <FaceFront label={card.domain}>
        <h2 className="study-card-title">{card.concept}</h2>
        {!flipped && <p className="study-card-hint">Press space or click to reveal</p>}
      </FaceFront>
      {flipped && (
        <FaceBack>
          <p className="study-card-oneliner">{card.oneliner}</p>
          <div className="study-card-section">
            <span className="study-card-section-label">Why it matters</span>
            <p>{card.whyItMatters}</p>
          </div>
          <div className="study-card-section">
            <span className="study-card-section-label">Analogy</span>
            <p>{card.analogy}</p>
          </div>
        </FaceBack>
      )}
    </>
  );
}

function ConnectionCard({ card, flipped }: { card: Extract<Card, { type: 'connection' }>; flipped: boolean }) {
  return (
    <>
      <FaceFront label={`Connection · ${card.domainA} ↔ ${card.domainB}`}>
        <h2 className="study-card-title">{card.concept}</h2>
        <p className="study-card-hint">
          How do <strong>{card.conceptA}</strong> and <strong>{card.conceptB}</strong> connect?
        </p>
      </FaceFront>
      {flipped && (
        <FaceBack>
          <p className="study-card-oneliner">{card.connection}</p>
          <div className="study-card-section">
            <span className="study-card-section-label">Insight</span>
            <p>{card.insight}</p>
          </div>
          <div className="study-card-section">
            <span className="study-card-section-label">Prompt</span>
            <p className="study-card-prompt">{card.prompt}</p>
          </div>
        </FaceBack>
      )}
    </>
  );
}

function ApplicationCard({ card, flipped }: { card: Extract<Card, { type: 'application' }>; flipped: boolean }) {
  return (
    <>
      <FaceFront label={`Application · ${card.domain}`}>
        <h2 className="study-card-title">{card.concept}</h2>
        <p className="study-card-problem">{card.problem}</p>
        {!flipped && <p className="study-card-hint">What are the first-order and second-order effects?</p>}
      </FaceFront>
      {flipped && (
        <FaceBack>
          <div className="study-card-section">
            <span className="study-card-section-label">First order</span>
            <p>{card.firstOrder}</p>
          </div>
          <div className="study-card-section">
            <span className="study-card-section-label">Second order</span>
            <p>{card.secondOrder}</p>
          </div>
          <div className="study-card-section">
            <span className="study-card-section-label">Lesson</span>
            <p>{card.lesson}</p>
          </div>
        </FaceBack>
      )}
    </>
  );
}

function SynthesisCard({ card, flipped }: { card: Extract<Card, { type: 'synthesis' }>; flipped: boolean }) {
  return (
    <>
      <FaceFront label={`Synthesis · ${card.domains.join(' · ')}`}>
        <h2 className="study-card-title">{card.title}</h2>
        <div className="study-card-concepts">
          {card.concepts.map((c) => (
            <span key={c} className="study-card-concept-chip">{c}</span>
          ))}
        </div>
        {!flipped && <p className="study-card-hint">What is the synthesis across these ideas?</p>}
      </FaceFront>
      {flipped && (
        <FaceBack>
          <p className="study-card-synthesis">{card.synthesis}</p>
        </FaceBack>
      )}
    </>
  );
}

function ScenarioCard({ card, flipped }: { card: Extract<Card, { type: 'scenario' }>; flipped: boolean }) {
  return (
    <>
      <FaceFront label={`Scenario · ${card.domains.join(' · ')}`}>
        <h2 className="study-card-title">{card.concept}</h2>
        <p className="study-card-scenario">{card.scenario}</p>
        {!flipped && <p className="study-card-hint">Which concepts explain this? What is the underlying pattern?</p>}
      </FaceFront>
      {flipped && (
        <FaceBack>
          <div className="study-card-section">
            <span className="study-card-section-label">Relevant concepts</span>
            <div className="study-card-concepts">
              {card.relevantConcepts.map((c) => (
                <span key={c} className="study-card-concept-chip">{c}</span>
              ))}
            </div>
          </div>
          <div className="study-card-section">
            <span className="study-card-section-label">Explanation</span>
            <p>{card.explanation}</p>
          </div>
        </FaceBack>
      )}
    </>
  );
}
