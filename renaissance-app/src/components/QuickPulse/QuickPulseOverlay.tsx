import { useState, useCallback, useEffect } from 'react';
import { RadarChart } from '../RadarChart/RadarChart';
import { computeFullResult, domainLabel } from '../../lib/scoring';
import { generateProfileIntelligence } from '../../lib/profile-intelligence';
import moduleData from '../../data/quick-pulse-module.json';
import type { QuickPulseModule, AssessmentResult, QuestionResponse, ProfileIntelligence, DomainKey } from '../../types';
import './QuickPulseOverlay.css';

const qpData = moduleData as unknown as QuickPulseModule;

interface QuickPulseOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult, intelligence: ProfileIntelligence) => void;
}

type Screen = 'intro' | 'question' | 'calculating' | 'results';

const QP_STORAGE_KEY = 'renaissance_quick_pulse_result';

function saveResult(result: AssessmentResult) {
  try { localStorage.setItem(QP_STORAGE_KEY, JSON.stringify(result)); } catch {}
}

export function loadSavedResult(): AssessmentResult | null {
  try {
    const stored = localStorage.getItem(QP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function QuickPulseOverlay({ isOpen, onClose, onComplete }: QuickPulseOverlayProps) {
  const [screen, setScreen] = useState<Screen>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProfileIntelligence | null>(null);

  const total = qpData.questions.length;
  const question = qpData.questions[currentQ];

  const reset = useCallback(() => {
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
    setIntelligence(null);
    setScreen('intro');
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (!answers[question.id]) return;
    if (currentQ < total - 1) {
      setCurrentQ(c => c + 1);
    } else {
      // Submit
      setScreen('calculating');
      setTimeout(() => {
        const responses: QuestionResponse[] = Object.entries(answers).map(([qid, oid]) => ({
          question_id: qid,
          option_id: oid,
        }));
        const r = computeFullResult(responses, qpData);
        const intel = generateProfileIntelligence(r);
        setResult(r);
        setIntelligence(intel);
        saveResult(r);
        onComplete(r, intel);
        setScreen('results');
      }, 900);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(c => c - 1);
  };

  if (!isOpen) return null;

  return (
    <div className="qp-overlay is-open">
      <div className="qp-container">
        <div className="qp-header">
          <span className="qp-header-brand">Quick Pulse</span>
          <button className="qp-close" onClick={onClose} aria-label="Close assessment">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Intro Screen */}
        {screen === 'intro' && (
          <div className="qp-screen is-active">
            <div className="qp-intro">
              <div className="eyebrow">The Quick Pulse</div>
              <h2>{qpData.intro.headline}</h2>
              <p className="qp-intro-body">{qpData.intro.body}</p>
              <div className="qp-intro-bullets">
                {qpData.intro.bullets.map(b => <span key={b} className="pill">{b}</span>)}
              </div>
              <p className="qp-intro-note">Your result is a directional baseline — not a definitive measurement.</p>
              <button className="qp-start-btn" onClick={() => { reset(); setScreen('question'); }}>
                Start Quick Pulse
              </button>
              <button className="qp-back-link" onClick={onClose}>
                Back to Assessment Modes
              </button>
            </div>
          </div>
        )}

        {/* Question Screen */}
        {screen === 'question' && (
          <div className="qp-screen is-active">
            <div className="qp-progress" aria-live="polite">
              <div className="qp-progress-info">
                <span>Question {currentQ + 1} of {total}</span>
                <span>{Math.round(((currentQ + 1) / total) * 100)}%</span>
              </div>
              <div className="qp-progress-track">
                <div className="qp-progress-fill" style={{ width: `${((currentQ + 1) / total) * 100}%` }} />
              </div>
            </div>
            <div className="qp-question-card">
              <p className="qp-prompt">{question.prompt}</p>
              <div className="qp-options" role="radiogroup">
                {question.options.map(opt => (
                  <button
                    key={opt.id}
                    className={`qp-option ${answers[question.id] === opt.id ? 'is-selected' : ''}`}
                    role="radio"
                    aria-checked={answers[question.id] === opt.id}
                    onClick={() => selectAnswer(question.id, opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="qp-nav">
                <button
                  className="qp-nav-btn qp-btn-back"
                  onClick={handleBack}
                  style={{ visibility: currentQ === 0 ? 'hidden' : 'visible' }}
                >
                  Back
                </button>
                <button
                  className="qp-nav-btn qp-btn-next"
                  onClick={handleNext}
                  disabled={!answers[question.id]}
                >
                  {currentQ === total - 1 ? 'See My Results' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calculating Screen */}
        {screen === 'calculating' && (
          <div className="qp-screen is-active">
            <div className="qp-calculating">
              <div className="qp-calc-spinner" aria-hidden="true" />
              <p className="qp-calc-text">Mapping your Renaissance profile...</p>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {screen === 'results' && result && intelligence && (
          <div className="qp-screen is-active">
            <div className="qp-results">
              <div className="qp-results-header">
                <div className="eyebrow">Your Renaissance Profile</div>
                <h2>Assessment Complete</h2>
                <p className="qp-results-confidence">Directional baseline — Quick Pulse v1</p>
              </div>

              {/* Archetype */}
              <div className="qp-archetype-result">
                <span className="archetype-tag">{result.archetype.label}</span>
                <h3>{result.archetype.label}</h3>
                <p>{result.archetype.description}</p>
                <p className="qp-archetype-confidence">Confidence: {Math.round(result.archetype.confidence * 100)}%</p>
              </div>

              {/* Profile Intelligence Narrative */}
              <div className="qp-intelligence-card">
                <h4>Profile Analysis</h4>
                <p>{intelligence.narrative.summary}</p>
                <div className="qp-intel-section">
                  <h5>Archetype Rationale</h5>
                  <p>{intelligence.archetype_breakdown.rationale}</p>
                </div>
                <div className="qp-intel-section">
                  <h5>Growth Priority</h5>
                  <p>{intelligence.narrative.growth_priority}</p>
                </div>
              </div>

              {/* Radar */}
              <div className="qp-radar-section">
                <div className="qp-radar-wrap">
                  <RadarChart
                    labels={qpData.domains.map(d => d.label)}
                    values={qpData.domains.map(d => result.scores[d.key])}
                    showLabels={true}
                    animated={true}
                  />
                </div>
                <div className="qp-domain-list">
                  {qpData.domains.map(d => (
                    <div key={d.key} className="qp-domain-row">
                      <div className="qp-domain-head">
                        <span className="qp-domain-name">{d.label}</span>
                        <span>
                          <span className="qp-domain-score">{result.scores[d.key]}</span>{' '}
                          <span className="qp-domain-level">{result.levels[d.key]}</span>
                        </span>
                      </div>
                      <div className="qp-domain-bar">
                        <div className="qp-domain-fill" style={{ width: `${result.scores[d.key]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths / Growth */}
              <div className="qp-sg-grid">
                <div className="qp-sg-card">
                  <h4>Top Strengths</h4>
                  <div className="qp-sg-list">
                    {result.top_strengths.map(key => (
                      <div key={key} className="qp-sg-item qp-strength-item">
                        {domainLabel(key, qpData.domains)} — {result.scores[key]} ({result.levels[key]})
                      </div>
                    ))}
                  </div>
                </div>
                <div className="qp-sg-card">
                  <h4>Growth Domains</h4>
                  <div className="qp-sg-list">
                    {result.growth_domains.map(key => (
                      <div key={key} className="qp-sg-item qp-growth-item">
                        {domainLabel(key, qpData.domains)} — {result.scores[key]} ({result.levels[key]})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weak Domain Analysis */}
              {intelligence.weak_domains.length > 0 && (
                <div className="qp-weak-analysis">
                  <h4>Weak Domain Analysis</h4>
                  {intelligence.weak_domains.map(wd => (
                    <div key={wd.domain} className={`qp-weak-item qp-weak-${wd.severity}`}>
                      <div className="qp-weak-header">
                        <strong>{wd.label}</strong>
                        <span className={`qp-severity-badge qp-severity-${wd.severity}`}>{wd.severity}</span>
                      </div>
                      <div className="qp-weak-details">
                        Score: {wd.score} ({wd.level})
                        {wd.gap_from_functional > 0 && ` — ${wd.gap_from_functional} points below Functional`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Balance */}
              <div className="qp-balance-row">
                <div className="qp-balance-number">{result.balance_index}</div>
                <div className="qp-balance-info">
                  <h4>Balance Index</h4>
                  <p>{intelligence.balance_interpretation}</p>
                </div>
              </div>

              {/* Curriculum Recommendations */}
              <div className="qp-curriculum">
                <h4>Development Curriculum</h4>
                {intelligence.curriculum.map(c => (
                  <div key={c.domain} className={`qp-curriculum-card qp-priority-${c.priority}`}>
                    <div className="qp-curriculum-order">{c.order}</div>
                    <div className="qp-curriculum-info">
                      <span className="qp-curriculum-name">{c.module_name}</span>
                      <span className="qp-curriculum-domain">{c.domain_label}</span>
                      <p className="qp-curriculum-rationale">{c.rationale}</p>
                      <span className="qp-curriculum-time">{c.estimated_time}</span>
                      {c.dependencies.length > 0 && (
                        <span className="qp-curriculum-deps">
                          Prerequisite: {c.dependencies.map(d => domainLabel(d, qpData.domains)).join(', ')}
                        </span>
                      )}
                    </div>
                    <span className={`qp-priority-badge qp-priority-${c.priority}`}>{c.priority}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="qp-results-actions">
                <button className="hero-button" onClick={() => { onClose(); setTimeout(() => document.getElementById('development')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                  View Development Path
                </button>
                <button className="ghost-button" onClick={() => { reset(); setScreen('question'); }}>
                  Retake Quick Pulse
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
