import { useMemo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trackCtaClick } from '../../lib/analytics';
import { RadarChart } from '../RadarChart/RadarChart';
import { skillOrder } from '../../data/assessments';
import { loadCardStates } from '../../lib/srs/card-state-store';
import { countDueCards } from '../../lib/srs/scheduler';
import './Hero.css';

interface HeroProps {
  profile: Record<string, number>;
  onStartAssessment: () => void;
}

export function Hero({ profile, onStartAssessment }: HeroProps) {
  const { user } = useAuth();
  const constellationRef = useRef<SVGSVGElement>(null);
  const [dueCount, setDueCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const states = loadCardStates();
      setHasStarted(Object.keys(states).length > 0);
      setDueCount(countDueCards(states));
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    const svg = constellationRef.current;
    if (!svg) return;

    const stars: { x: number; y: number }[] = [];
    let lines = '';

    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 1200;
      const y = Math.random() * 600;
      const r = Math.random() * 1.5 + 0.5;
      stars.push({ x, y });
      lines += `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(212,175,55,${Math.random() * 0.4 + 0.1})"/>`;
    }

    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
        if (dist < 120 && Math.random() > 0.6) {
          lines += `<line x1="${stars[i].x}" y1="${stars[i].y}" x2="${stars[j].x}" y2="${stars[j].y}" stroke="rgba(212,175,55,0.08)" stroke-width="0.5"/>`;
        }
      }
    }

    lines += `<circle cx="600" cy="300" r="250" fill="none" stroke="rgba(212,175,55,0.06)" stroke-width="0.5"/>`;
    svg.innerHTML = lines;
  }, []);

  const radarValues = useMemo(() => skillOrder.map(s => profile[s] ?? 50), [profile]);

  const skillPositions = [
    { skill: 'Leadership', left: '32%', top: '8%' },
    { skill: 'Creativity', left: '62%', top: '8%' },
    { skill: 'Strategy', left: '72%', top: '32%' },
    { skill: 'Tech Proficiency', left: '28%', top: '78%' },
    { skill: 'Problem Solving', left: '26%', top: '52%' },
    { skill: 'Critical Thinking', left: '70%', top: '58%' },
    { skill: 'Adaptability', left: '35%', top: '92%' },
    { skill: 'Data Analysis', left: '60%', top: '92%' },
  ];

  return (
    <section className="section hero" id="home">
      <div className="container hero-shell">
        <div className="hero-top reveal">
          <div className="hero-brand-title">Renaissance Skills</div>
          <div className="hero-brand-sub">See your strengths, gaps, and next move in one pass.</div>
        </div>

        <div className="hero-headline reveal">
          <h1>Map What You're Made Of</h1>
          <p className="hero-value-prop">
            A short assessment turns scattered signals into a clear skill profile, ranked weak points, and a next-step plan you can use immediately.
          </p>
        </div>

        <div className="hero-center">
          <div className="hero-constellation" aria-hidden="true">
            <svg ref={constellationRef} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" />
          </div>

          <div className="hero-figure-wrap">
            <div className="hero-figure-circle" />
            <div className="hero-figure-square" />
            <div className="hero-radar-overlay">
              <RadarChart labels={skillOrder} values={radarValues} />
            </div>
            <div className="hero-figure-svg">
              <img src="/assets/Main%20Hero%20image%20Vetruvian.png" alt="Vitruvian Man — Renaissance Skills" className="hero-vitruvian-img" />
            </div>
          </div>

          <div className="hero-skill-labels">
            {skillPositions.map(p => (
              <span key={p.skill} className="hero-skill-label" style={{ left: p.left, top: p.top }}>
                {p.skill}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-cta-area reveal">
          {hasStarted ? (
            <>
              <Link
                className="hero-button"
                to="/study"
                onClick={() => void trackCtaClick('resume_study', 'hero', user?.id ?? null)}
              >
                {dueCount > 0
                  ? `Continue your Journey — ${dueCount} due today`
                  : 'Continue your Journey'}
              </Link>
              <p className="hero-cta-sub">
                Pick up the daily study loop.{' '}
                <button
                  type="button"
                  className="hero-link-inline"
                  onClick={() => {
                    void trackCtaClick('retake_assessment', 'hero', user?.id ?? null);
                    onStartAssessment();
                  }}
                >
                  Retake the assessment
                </button>{' '}
                to refresh your profile.
              </p>
            </>
          ) : (
            <>
              <button
                className="hero-button"
                onClick={() => {
                  void trackCtaClick('start_assessment', 'hero', user?.id ?? null);
                  onStartAssessment();
                }}
              >
                Start Your Individual Assessment
              </button>
              <p className="hero-cta-sub">10 questions • 3 minutes • 8 domains • one clear next step</p>
            </>
          )}
        </div>

        <div className="hero-info-bar reveal">
          <div className="hero-info-item">
            <svg className="hero-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7V12L15 14" /><path d="M8 2L4 5M16 2L20 5" />
            </svg>
            <span className="hero-info-title">How It Works</span>
            <span className="hero-info-desc">Answer 10 questions, get a score across 8 domains</span>
          </div>
          <div className="hero-info-item">
            <svg className="hero-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18.5L6 21.5L7 14.5L2 9.5L9 8.5Z" />
            </svg>
            <span className="hero-info-title">What You Get</span>
            <span className="hero-info-desc">A ranked growth plan based on your weakest domains</span>
          </div>
        </div>
      </div>
    </section>
  );
}
