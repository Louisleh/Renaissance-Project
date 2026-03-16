import './AboutSection.css';

export function AboutSection() {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="section-head reveal">
          <div className="eyebrow">About The Platform</div>
          <h2>Built on the belief that AI rewards orchestration more than narrow repetition.</h2>
          <p className="lede">
            The industrial logic of specialization produced immense efficiency. The AI era changes the winning profile:
            users who can connect abstractions, systems, people, and tools become disproportionately valuable.
          </p>
        </div>

        <div className="about-grid">
          <section className="about-card reveal">
            <h3>Product Thesis</h3>
            <p>
              Renaissance Skills is designed to expose lopsided development early, translate it into a living skill graph, and
              make weak-domain training feel as concrete as professional upskilling in a single discipline.
            </p>
          </section>
          <section className="about-card reveal">
            <h3>Who It Serves</h3>
            <ul>
              <li>Specialists exposed to automation risk</li>
              <li>Students building resilient, non-fragile career profiles</li>
              <li>Generalists who want a more formal synthesis framework</li>
            </ul>
          </section>
          <section className="about-card reveal">
            <h3>What's Next</h3>
            <ul>
              <li>Affiliate reading layers and foundational libraries</li>
              <li>Coaching integrations and accountability loops</li>
              <li>Expanded diagnostics for longitudinal growth tracking</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
