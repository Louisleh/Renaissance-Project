import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { RadarChart } from '../RadarChart/RadarChart';
import { UpgradeGate } from '../common/UpgradeGate';
import { computeFullResult, domainLabel } from '../../lib/scoring';
import { generateProfileIntelligence } from '../../lib/profile-intelligence';
import { generateLlmMirrorPrompt } from '../../lib/llm-mirror';
import { generateResultsPdf } from '../../lib/pdf-export';
import {
  trackAssessmentCompleted,
  trackAssessmentQuestionAnswered,
  trackAssessmentStarted,
  trackCtaClick,
  trackReassessmentTriggered,
} from '../../lib/analytics';
import {
  loadAssessmentResult,
  loadCurriculumProgress,
  saveAssessmentResult,
} from '../../lib/data-sync';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import moduleData from '../../data/quick-pulse-module.json';
import type { QuickPulseModule, AssessmentResult, QuestionResponse, ProfileIntelligence, DomainKey } from '../../types';
import './QuickPulseOverlay.css';

const qpData = moduleData as unknown as QuickPulseModule;

const domainCourseMap: Record<DomainKey, string> = {
  leadership: 'leadership_influence',
  creativity: 'creativity_cross_domain',
  strategy: 'strategy_systems',
  tech_proficiency: 'tech_fluency',
  problem_solving: 'problem_solving_constraints',
  critical_thinking: 'critical_thinking_assumptions',
  adaptability: 'adaptability_change',
  data_analysis: 'data_evidence',
};

interface QuickPulseOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult, intelligence: ProfileIntelligence) => void;
}

type Screen = 'intro' | 'question' | 'calculating' | 'results';

// eslint-disable-next-line react-refresh/only-export-components
export function loadSavedResult(): AssessmentResult | null {
  return loadAssessmentResult('quick_pulse');
}

function getElapsedMs(startedAt: number): number {
  const now = typeof window !== 'undefined' && typeof window.performance !== 'undefined'
    ? window.performance.now()
    : Date.now();

  return Math.max(0, Math.round(now - startedAt));
}

// Animated score display
function AnimatedScore({ value }: { value: number }) {
  const animated = useAnimatedCounter(value, 1200, true);
  return <span className="qp-domain-score">{animated}</span>;
}

function AnimatedBalance({ value }: { value: number }) {
  const animated = useAnimatedCounter(value, 1400, true);
  return <div className="qp-balance-number">{animated}</div>;
}

function getSummaryPreview(summary: string): string {
  const sentences = summary.split('. ');
  return sentences[0]?.endsWith('.') ? sentences[0] : `${sentences[0] ?? summary}.`;
}

export function QuickPulseOverlay({ isOpen, onClose, onComplete }: QuickPulseOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess } = useSubscription();
  const [screen, setScreen] = useState<Screen>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProfileIntelligence | null>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const questionCardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const questionStartedAtRef = useRef(0);

  const total = qpData.questions.length;
  const question = qpData.questions[currentQ];

  const reset = useCallback(() => {
    setCurrentQ(0);
    setAnswers({});
    setResult(null);
    setIntelligence(null);
    setScreen('intro');
    setSlideDirection('forward');
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the container when opened
      window.setTimeout(() => containerRef.current?.focus(), 100);
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

  // Smooth question transition
  const transitionToQuestion = useCallback((newQ: number, direction: 'forward' | 'back') => {
    setSlideDirection(direction);
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentQ(newQ);
      setIsTransitioning(false);
    }, 200);
  }, []);

  const selectAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  useEffect(() => {
    if (screen !== 'question') {
      return;
    }

    questionStartedAtRef.current = typeof window !== 'undefined' && typeof window.performance !== 'undefined'
      ? window.performance.now()
      : Date.now();
  }, [currentQ, screen]);

  const handleStart = () => {
    const progress = loadCurriculumProgress();
    const previousResult = loadSavedResult();

    void trackAssessmentStarted('quick_pulse', user?.id ?? null);

    if (progress?.reassessment_available && previousResult) {
      void trackReassessmentTriggered(previousResult.assessment_id, user?.id ?? null);
    }

    reset();
    setScreen('question');
  };

  const handleNext = () => {
    if (!answers[question.id]) return;

    void trackAssessmentQuestionAnswered(
      'quick_pulse',
      currentQ + 1,
      getElapsedMs(questionStartedAtRef.current),
      user?.id ?? null
    );

    if (currentQ < total - 1) {
      transitionToQuestion(currentQ + 1, 'forward');
    } else {
      setScreen('calculating');
      window.setTimeout(() => {
        const responses: QuestionResponse[] = Object.entries(answers).map(([qid, oid]) => ({
          question_id: qid,
          option_id: oid,
        }));
        const r = computeFullResult(responses, qpData);
        const intel = generateProfileIntelligence(r);
        setResult(r);
        setIntelligence(intel);
        void saveAssessmentResult('quick_pulse', r, intel, user?.id ?? null);
        void trackAssessmentCompleted('quick_pulse', r.archetype.key, r.balance_index, user?.id ?? null);
        onComplete(r, intel);
        setScreen('results');
      }, 900);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) transitionToQuestion(currentQ - 1, 'back');
  };

  // Keyboard navigation within options
  const handleOptionKeyDown = (e: ReactKeyboardEvent, optionId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectAnswer(question.id, optionId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="qp-overlay is-open" role="dialog" aria-modal="true" aria-label="Quick Pulse Assessment">
      <div className="qp-container" ref={containerRef} tabIndex={-1}>
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
          <div className="qp-screen is-active qp-screen-enter">
            <div className="qp-intro">
              <div className="eyebrow">The Quick Pulse</div>
              <h2>{qpData.intro.headline}</h2>
              <p className="qp-intro-body">{qpData.intro.body}</p>
              <div className="qp-intro-bullets">
                {qpData.intro.bullets.map((b, i) => (
                  <span key={b} className="pill" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                    {b}
                  </span>
                ))}
              </div>
              <p className="qp-intro-note">Your result is a directional baseline — not a definitive measurement.</p>
              <button className="qp-start-btn" onClick={handleStart}>
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
            <div
              ref={questionCardRef}
              className={`qp-question-card ${isTransitioning ? `qp-slide-out-${slideDirection}` : 'qp-slide-in'}`}
              key={currentQ}
            >
              <p className="qp-prompt">{question.prompt}</p>
              <div className="qp-options" role="radiogroup" aria-label={`Question ${currentQ + 1}`}>
                {question.options.map((opt, i) => (
                  <button
                    key={opt.id}
                    className={`qp-option ${answers[question.id] === opt.id ? 'is-selected' : ''}`}
                    role="radio"
                    aria-checked={answers[question.id] === opt.id}
                    onClick={() => selectAnswer(question.id, opt.id)}
                    onKeyDown={(e) => handleOptionKeyDown(e, opt.id)}
                    style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                    tabIndex={0}
                  >
                    <span className="qp-option-letter">{String.fromCharCode(65 + i)}</span>
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
              <div className="qp-calc-ring" aria-hidden="true">
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="2" />
                  <circle cx="40" cy="40" r="35" fill="none" stroke="var(--gold)" strokeWidth="2"
                    strokeDasharray="220" strokeDashoffset="160" strokeLinecap="round"
                    className="qp-calc-arc" />
                  <circle cx="40" cy="40" r="18" fill="none" stroke="rgba(212,175,55,0.06)" strokeWidth="1" />
                  <circle cx="40" cy="40" r="6" fill="var(--gold)" opacity="0.3" />
                </svg>
              </div>
              <p className="qp-calc-text">Mapping your Renaissance profile...</p>
              <div className="qp-calc-dots">
                <span className="qp-calc-dot" />
                <span className="qp-calc-dot" />
                <span className="qp-calc-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {screen === 'results' && result && intelligence && (
          <div className="qp-screen is-active qp-results-enter">
            <div className="qp-results">
              <div className="qp-results-header">
                <div className="eyebrow">Your Renaissance Profile</div>
                <h2>Assessment Complete</h2>
                <p className="qp-results-confidence">Directional baseline — Quick Pulse v1</p>
              </div>

              {/* Archetype with entrance animation */}
              <div className="qp-archetype-result qp-stagger-1">
                <span className="archetype-tag">{result.archetype.label}</span>
                <h3>{result.archetype.label}</h3>
                <p>{result.archetype.description}</p>
                <p className="qp-archetype-confidence">
                  Confidence: {Math.round(result.archetype.confidence * 100)}%
                </p>
              </div>

              {/* Profile Intelligence Narrative */}
              <div className="qp-intelligence-card qp-stagger-2">
                <h4>Profile Analysis</h4>
                <p>{hasAccess('full_intelligence') ? intelligence.narrative.summary : getSummaryPreview(intelligence.narrative.summary)}</p>
                {hasAccess('full_intelligence') ? (
                  <>
                    <div className="qp-intel-section">
                      <h5>Archetype Rationale</h5>
                      <p>{intelligence.archetype_breakdown.rationale}</p>
                    </div>
                    <div className="qp-intel-section">
                      <h5>Growth Priority</h5>
                      <p>{intelligence.narrative.growth_priority}</p>
                    </div>
                  </>
                ) : (
                  <UpgradeGate feature="full_intelligence">
                    <div>
                      <div className="qp-intel-section">
                        <h5>Archetype Rationale</h5>
                        <p>{intelligence.archetype_breakdown.rationale}</p>
                      </div>
                      <div className="qp-intel-section">
                        <h5>Growth Priority</h5>
                        <p>{intelligence.narrative.growth_priority}</p>
                      </div>
                    </div>
                  </UpgradeGate>
                )}
              </div>

              {/* Radar */}
              <div className="qp-radar-section qp-stagger-3">
                <div className="qp-radar-wrap">
                  <RadarChart
                    labels={qpData.domains.map(d => d.label)}
                    values={qpData.domains.map(d => result.scores[d.key])}
                    showLabels={true}
                    animated={true}
                  />
                </div>
                <div className="qp-domain-list">
                  {qpData.domains.map((d, i) => (
                    <button
                      key={d.key}
                      className="qp-domain-row qp-domain-clickable"
                      style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                      onClick={() => {
                        void trackCtaClick('domain_drill', 'quick_pulse_results', user?.id ?? null);
                        onClose();
                        navigate(`/curriculum/${domainCourseMap[d.key]}`);
                      }}
                      title={`${d.description} — Click to explore ${d.label} course`}
                    >
                      <div className="qp-domain-head">
                        <span className="qp-domain-name">{d.label}</span>
                        <span>
                          <AnimatedScore value={result.scores[d.key]} />{' '}
                          <span className="qp-domain-level">{result.levels[d.key]}</span>
                        </span>
                      </div>
                      <div className="qp-domain-bar">
                        <div
                          className="qp-domain-fill qp-bar-animate"
                          style={{
                            '--bar-width': `${result.scores[d.key]}%`,
                            animationDelay: `${0.4 + i * 0.1}s`,
                          } as CSSProperties}
                        />
                      </div>
                      <span className="qp-domain-explore">Explore →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Strengths / Growth */}
              <div className="qp-sg-grid qp-stagger-4">
                <div className="qp-sg-card">
                  <h4>Top Strengths</h4>
                  <div className="qp-sg-list">
                    {result.top_strengths.map(key => (
                      <div key={key} className="qp-sg-item qp-strength-item">
                        <span className="qp-sg-indicator qp-sg-strength-dot" />
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
                        <span className="qp-sg-indicator qp-sg-growth-dot" />
                        {domainLabel(key, qpData.domains)} — {result.scores[key]} ({result.levels[key]})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weak Domain Analysis */}
              {intelligence.weak_domains.length > 0 && (
                <div className="qp-weak-analysis qp-stagger-5">
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
              <div className="qp-balance-row qp-stagger-5">
                <AnimatedBalance value={result.balance_index} />
                <div className="qp-balance-info">
                  <h4>Balance Index</h4>
                  <p>{intelligence.balance_interpretation}</p>
                </div>
              </div>

              {/* Curriculum Recommendations */}
              <div className="qp-curriculum qp-stagger-6">
                <h4>Development Curriculum</h4>
                {intelligence.curriculum.map((c, i) => (
                  <div
                    key={c.domain}
                    className={`qp-curriculum-card qp-priority-${c.priority}`}
                    style={{ animationDelay: `${0.6 + i * 0.1}s` }}
                  >
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

              {/* Shareable Profile Summary */}
              <UpgradeGate feature="shareable_card">
                <div className="qp-share-card qp-stagger-7">
                  <div className="qp-share-inner">
                    <div className="qp-share-brand">Renaissance Skills</div>
                    <div className="qp-share-archetype">{result.archetype.label}</div>
                    <div className="qp-share-scores">
                      {qpData.domains.map(d => (
                        <div key={d.key} className="qp-share-score-item">
                          <span>{d.label}</span>
                          <strong>{result.scores[d.key]}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="qp-share-balance">Balance: {result.balance_index}</div>
                    <div className="qp-share-footer">renaissanceskills.com</div>
                  </div>
                </div>
              </UpgradeGate>

              {/* LLM Mirror */}
              <div className="qp-llm-mirror qp-stagger-7">
                <h4>LLM Mirror</h4>
                <p>Copy a personalized prompt to run in your own LLM (ChatGPT, Claude, etc.) for a deeper self-reflection based on your profile.</p>
                <button
                  className="ghost-button"
                  onClick={() => {
                    const prompt = generateLlmMirrorPrompt(result, intelligence);
                    void navigator.clipboard.writeText(prompt);
                    void trackCtaClick('copy_llm_mirror', 'quick_pulse_results', user?.id ?? null);
                    const btn = document.querySelector('.qp-llm-copy-btn') as HTMLButtonElement | null;
                    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy LLM Prompt'; }, 2000); }
                  }}
                >
                  <span className="qp-llm-copy-btn">Copy LLM Prompt</span>
                </button>
              </div>

              {/* Actions */}
              <div className="qp-results-actions qp-stagger-8">
                <button className="hero-button" onClick={() => { onClose(); setTimeout(() => document.getElementById('development')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                  View Development Path
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    void trackCtaClick('view_curriculum', 'quick_pulse_results', user?.id ?? null);
                    onClose();
                    navigate('/curriculum');
                  }}
                >
                  View Curriculum
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    void trackCtaClick('download_pdf', 'quick_pulse_results', user?.id ?? null);
                    generateResultsPdf(result, intelligence, qpData.domains);
                  }}
                >
                  Download PDF
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
