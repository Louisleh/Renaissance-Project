import './AboutSection.css';

export function AboutSection() {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">About The Platform</div>
          <h2>Built for people who want a clearer read on their skills, not more noise.</h2>
          <p className="lede">
            Renaissance Skills turns a short assessment into a domain graph, a ranked weak-point map, and a next-step plan.
            The goal is simple: help people see what to improve and what to do next.
          </p>
        </div>

        <div className="about-grid">
          <section className="about-card reveal">
            <h3>Product Thesis</h3>
            <p>
              We expose lopsided development early, translate it into a living skill graph, and keep the next best move visible.
            </p>
          </section>
          <section className="about-card reveal">
            <h3>Who It Serves</h3>
            <ul>
              <li>People changing roles or planning their next career step</li>
              <li>Students building a stronger, more resilient skill profile</li>
              <li>Generalists who want a clearer framework for synthesis and growth</li>
            </ul>
          </section>
          <section className="about-card reveal">
            <h3>Built for the AI Transition</h3>
            <p>
              When AI handles more routine execution, the advantage goes to people who can connect disciplines,
              compare evidence, and make better calls across systems.
            </p>
          </section>
        </div>

        <div className="trust-bar reveal">
          <div className="trust-stat">
            <strong>8</strong>
            <span>Core professional domains scored</span>
          </div>
          <div className="trust-stat">
            <strong>3</strong>
            <span>Assessment modes, including privacy-first LLM analysis</span>
          </div>
          <div className="trust-stat">
            <strong>40+</strong>
            <span>Micro-lessons across the full curriculum</span>
          </div>
        </div>
      </div>
    </section>
  );
}
