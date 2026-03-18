/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RadarChart } from '../RadarChart/RadarChart';
import { generateProfileIntelligence } from '../../lib/profile-intelligence';
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
import {
  computeDeepDiveResult,
  computeRetakeDelta,
  getCurrentQuestion,
  getCurrentScenarioContext,
  getProgress,
  goBack,
  initDeepDive,
  submitAnswer,
} from '../../lib/deep-dive-engine';
import { domainLabel } from '../../lib/scoring';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { loadSavedResult } from '../QuickPulse/QuickPulseOverlay';
import moduleData from '../../data/deep-dive-module.json';
import type {
  AssessmentResult,
  DeepDiveModule,
  DeepDiveState,
  ProfileIntelligence,
  RetakeDelta,
} from '../../types';
import './DeepDiveOverlay.css';

const ddData = moduleData as unknown as DeepDiveModule;

interface DeepDiveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult, intelligence: ProfileIntelligence) => void;
}

type Screen = 'intro' | 'question' | 'calculating' | 'results';

export function loadSavedDeepDiveResult(): AssessmentResult | null {
  return loadAssessmentResult('deep_dive');
}

function getElapsedMs(startedAt: number): number {
  const now = typeof window !== 'undefined' && typeof window.performance !== 'undefined'
    ? window.performance.now()
    : Date.now();

  return Math.max(0, Math.round(now - startedAt));
}

function AnimatedScore({ value }: { value: number }) {
  const animated = useAnimatedCounter(value, 1200, true);
  return <span className="dd-domain-score">{animated}</span>;
}

function AnimatedBalance({ value }: { value: number }) {
  const animated = useAnimatedCounter(value, 1400, true);
  return <div className="dd-balance-number">{animated}</div>;
}

function getTransitionCopy(previousPhase: DeepDiveState['phase'], nextPhase: DeepDiveState['phase']): string {
  if (previousPhase === 'core' && nextPhase === 'probing') {
    return 'Analyzing your profile for targeted follow-up probes...';
  }

  if (previousPhase === 'core' && nextPhase === 'scenarios') {
    return 'Your core signal is clear. Loading the scenario sequence...';
  }

  if (previousPhase === 'probing' && nextPhase === 'scenarios') {
    return 'Your probes are complete. Preparing scenario-based pressure tests...';
  }

  return 'Analyzing your profile...';
}

function getDeltaIndicator(change: number): string {
  if (change > 0) {
    return '↑';
  }

  if (change < 0) {
    return '↓';
  }

  return '→';
}

export function DeepDiveOverlay({ isOpen, onClose, onComplete }: DeepDiveOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>('intro');
  const [deepDiveState, setDeepDiveState] = useState<DeepDiveState>(() => initDeepDive(ddData));
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProfileIntelligence | null>(null);
  const [retakeDelta, setRetakeDelta] = useState<RetakeDelta | null>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [calculatingCopy, setCalculatingCopy] = useState('Analyzing your profile...');
  const containerRef = useRef<HTMLDivElement>(null);
  const questionStartedAtRef = useRef(0);

  const question = getCurrentQuestion(deepDiveState, ddData);
  const progress = getProgress(deepDiveState);
  const scenarioContext = getCurrentScenarioContext(deepDiveState, ddData);
  const currentScenario = deepDiveState.phase === 'scenarios'
    ? ddData.scenarios[deepDiveState.currentScenarioIndex] ?? null
    : null;
  const previousArchetypeLabel = retakeDelta
    ? ddData.archetypes.find((archetype) => archetype.key === retakeDelta.previous_archetype)?.label ?? retakeDelta.previous_archetype
    : null;

  const reset = useCallback(() => {
    setDeepDiveState(initDeepDive(ddData));
    setSelectedOptionId(null);
    setResult(null);
    setIntelligence(null);
    setRetakeDelta(null);
    setScreen('intro');
    setSlideDirection('forward');
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => containerRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedOptionId(null);
  }, [deepDiveState.currentQuestionIndex, deepDiveState.phase]);

  useEffect(() => {
    if (screen !== 'question') {
      return;
    }

    questionStartedAtRef.current = typeof window !== 'undefined' && typeof window.performance !== 'undefined'
      ? window.performance.now()
      : Date.now();
  }, [deepDiveState.currentQuestionIndex, deepDiveState.phase, screen]);

  const selectAnswer = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const handleStart = () => {
    const progressSnapshot = loadCurriculumProgress();
    const previousResult = loadSavedDeepDiveResult() ?? loadSavedResult();

    void trackAssessmentStarted('deep_dive', user?.id ?? null);

    if (progressSnapshot?.reassessment_available && previousResult) {
      void trackReassessmentTriggered(previousResult.assessment_id, user?.id ?? null);
    }

    reset();
    setScreen('question');
  };

  const handleNext = () => {
    if (!question || !selectedOptionId) {
      return;
    }

    void trackAssessmentQuestionAnswered(
      'deep_dive',
      progress.current,
      getElapsedMs(questionStartedAtRef.current),
      user?.id ?? null
    );

    const nextState = submitAnswer(
      deepDiveState,
      {
        question_id: question.id,
        option_id: selectedOptionId,
      },
      ddData
    );

    if (nextState.phase === 'complete') {
      setScreen('calculating');
      setCalculatingCopy('Synthesizing your Deep Dive profile...');

      window.setTimeout(() => {
        const nextResult = computeDeepDiveResult(nextState, ddData);
        const nextIntelligence = generateProfileIntelligence(nextResult);
        const quickPulseResult = loadSavedResult();

        setDeepDiveState(nextState);
        setResult(nextResult);
        setIntelligence(nextIntelligence);
        setRetakeDelta(quickPulseResult ? computeRetakeDelta(quickPulseResult, nextResult) : null);
        void saveAssessmentResult('deep_dive', nextResult, nextIntelligence, user?.id ?? null);
        void trackAssessmentCompleted('deep_dive', nextResult.archetype.key, nextResult.balance_index, user?.id ?? null);
        onComplete(nextResult, nextIntelligence);
        setScreen('results');
      }, 900);

      return;
    }

    if (nextState.phase !== deepDiveState.phase) {
      setCalculatingCopy(getTransitionCopy(deepDiveState.phase, nextState.phase));
      setScreen('calculating');

      window.setTimeout(() => {
        setDeepDiveState(nextState);
        setScreen('question');
      }, 700);

      return;
    }

    setSlideDirection('forward');
    setIsTransitioning(true);

    window.setTimeout(() => {
      setDeepDiveState(nextState);
      setIsTransitioning(false);
    }, 200);
  };

  const handleBack = () => {
    const previousState = goBack(deepDiveState);
    if (previousState === deepDiveState) {
      return;
    }

    setSlideDirection('back');
    setIsTransitioning(true);

    window.setTimeout(() => {
      setDeepDiveState(previousState);
      setIsTransitioning(false);
    }, 200);
  };

  const handleOptionKeyDown = (event: ReactKeyboardEvent, optionId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectAnswer(optionId);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dd-overlay is-open" role="dialog" aria-modal="true" aria-label="Deep Dive Assessment">
      <div className="dd-container" ref={containerRef} tabIndex={-1}>
        <div className="dd-header">
          <span className="dd-header-brand">The Deep Dive</span>
          <button className="dd-close" onClick={onClose} aria-label="Close assessment">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {screen === 'intro' && (
          <div className="dd-screen is-active dd-screen-enter">
            <div className="dd-intro">
              <div className="eyebrow">The Deep Dive</div>
              <h2>{ddData.intro.headline}</h2>
              <p className="dd-intro-body">{ddData.intro.body}</p>
              <div className="dd-intro-bullets">
                {ddData.intro.bullets.map((bullet) => (
                  <span key={bullet} className="pill">{bullet}</span>
                ))}
              </div>
              <p className="dd-intro-note">
                This mode uses deeper scenarios and adaptive probes, so expect a longer run and a stronger confidence signal.
              </p>
              <button className="dd-start-btn" onClick={handleStart}>
                Start Deep Dive
              </button>
              <button className="dd-back-link" onClick={onClose}>
                Back to Assessment Modes
              </button>
            </div>
          </div>
        )}

        {screen === 'question' && question && (
          <div className="dd-screen is-active">
            <div className="dd-progress" aria-live="polite">
              <div className="dd-progress-info">
                <span>{progress.phase}</span>
                <span>Question {progress.current} of {progress.total}</span>
              </div>
              <div className="dd-progress-track">
                <div className="dd-progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>

            {currentScenario && scenarioContext && (
              <section className="dd-scenario-context">
                <div className="dd-scenario-kicker">{currentScenario.title}</div>
                <p>{scenarioContext}</p>
              </section>
            )}

            <div className={`dd-question-card ${isTransitioning ? `dd-slide-out-${slideDirection}` : 'dd-slide-in'}`}>
              <p className="dd-prompt">{question.prompt}</p>
              <div className="dd-options" role="radiogroup" aria-label={question.prompt}>
                {question.options.map((option, index) => (
                  <button
                    key={option.id}
                    className={`dd-option ${selectedOptionId === option.id ? 'is-selected' : ''}`}
                    role="radio"
                    aria-checked={selectedOptionId === option.id}
                    onClick={() => selectAnswer(option.id)}
                    onKeyDown={(event) => handleOptionKeyDown(event, option.id)}
                    tabIndex={0}
                  >
                    <span className="dd-option-letter">{String.fromCharCode(65 + index)}</span>
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="dd-nav">
                <button
                  className="dd-nav-btn dd-btn-back"
                  onClick={handleBack}
                  style={{ visibility: deepDiveState.currentQuestionIndex === 0 ? 'hidden' : 'visible' }}
                >
                  Back
                </button>
                <button
                  className="dd-nav-btn dd-btn-next"
                  onClick={handleNext}
                  disabled={!selectedOptionId}
                >
                  {progress.current === progress.total ? 'See My Results' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'calculating' && (
          <div className="dd-screen is-active">
            <div className="dd-calculating">
              <div className="dd-calc-ring" aria-hidden="true">
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="2" />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="2"
                    strokeDasharray="220"
                    strokeDashoffset="160"
                    strokeLinecap="round"
                    className="dd-calc-arc"
                  />
                </svg>
              </div>
              <p className="dd-calc-text">{calculatingCopy}</p>
              <div className="dd-calc-dots">
                <span className="dd-calc-dot" />
                <span className="dd-calc-dot" />
                <span className="dd-calc-dot" />
              </div>
            </div>
          </div>
        )}

        {screen === 'results' && result && intelligence && (
          <div className="dd-screen is-active dd-results-enter">
            <div className="dd-results">
              <div className="dd-results-header">
                <div className="eyebrow">Your Renaissance Profile</div>
                <h2>Deep Dive Complete</h2>
                <p className="dd-results-confidence">High-fidelity signal — Deep Dive v1</p>
              </div>

              <div className="dd-archetype-result">
                <span className="archetype-tag">{result.archetype.label}</span>
                <h3>{result.archetype.label}</h3>
                <p>{result.archetype.description}</p>
                <p className="dd-archetype-confidence">
                  Confidence: {Math.round(result.archetype.confidence * 100)}%
                </p>
              </div>

              <div className="dd-intelligence-card">
                <h4>Profile Analysis</h4>
                <p>{intelligence.narrative.summary}</p>
                <div className="dd-intel-section">
                  <h5>Archetype Rationale</h5>
                  <p>{intelligence.archetype_breakdown.rationale}</p>
                </div>
                <div className="dd-intel-section">
                  <h5>Growth Priority</h5>
                  <p>{intelligence.narrative.growth_priority}</p>
                </div>
              </div>

              <div className="dd-radar-section">
                <div className="dd-radar-wrap">
                  <RadarChart
                    labels={ddData.domains.map((domain) => domain.label)}
                    values={ddData.domains.map((domain) => result.scores[domain.key])}
                    showLabels={true}
                    animated={true}
                  />
                </div>
                <div className="dd-domain-list">
                  {ddData.domains.map((domain) => (
                    <div key={domain.key} className="dd-domain-row">
                      <div className="dd-domain-head">
                        <span className="dd-domain-name">{domain.label}</span>
                        <span>
                          <AnimatedScore value={result.scores[domain.key]} />{' '}
                          <span className="dd-domain-level">{result.levels[domain.key]}</span>
                        </span>
                      </div>
                      <div className="dd-domain-bar">
                        <div className="dd-domain-fill" style={{ width: `${result.scores[domain.key]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {retakeDelta && (
                <div className="dd-compare-section">
                  <h4>Compare with Quick Pulse</h4>
                  <div className="dd-compare-summary">
                    <span>Previous archetype: {previousArchetypeLabel}</span>
                    <span>
                      Archetype change: {retakeDelta.archetype_changed ? 'Yes' : 'No'}
                    </span>
                    <span>
                      Balance delta: {retakeDelta.balance_delta >= 0 ? '+' : ''}
                      {retakeDelta.balance_delta}
                    </span>
                  </div>
                  <div className="dd-compare-grid">
                    {ddData.domains.map((domain) => {
                      const delta = retakeDelta.domain_deltas[domain.key];
                      return (
                        <div key={domain.key} className="dd-compare-item">
                          <span className="dd-compare-label">{domain.label}</span>
                          <strong>{delta.previous} → {delta.current}</strong>
                          <span className={`dd-compare-delta ${delta.change > 0 ? 'is-positive' : delta.change < 0 ? 'is-negative' : 'is-neutral'}`}>
                            {getDeltaIndicator(delta.change)} {delta.change >= 0 ? '+' : ''}
                            {delta.change}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="dd-sg-grid">
                <div className="dd-sg-card">
                  <h4>Top Strengths</h4>
                  <div className="dd-sg-list">
                    {result.top_strengths.map((domainKey) => (
                      <div key={domainKey} className="dd-sg-item dd-strength-item">
                        <span className="dd-sg-indicator dd-sg-strength-dot" />
                        {domainLabel(domainKey, ddData.domains)} — {result.scores[domainKey]} ({result.levels[domainKey]})
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dd-sg-card">
                  <h4>Growth Domains</h4>
                  <div className="dd-sg-list">
                    {result.growth_domains.map((domainKey) => (
                      <div key={domainKey} className="dd-sg-item dd-growth-item">
                        <span className="dd-sg-indicator dd-sg-growth-dot" />
                        {domainLabel(domainKey, ddData.domains)} — {result.scores[domainKey]} ({result.levels[domainKey]})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dd-balance-row">
                <AnimatedBalance value={result.balance_index} />
                <div className="dd-balance-info">
                  <h4>Balance Index</h4>
                  <p>{intelligence.balance_interpretation}</p>
                </div>
              </div>

              <div className="dd-curriculum">
                <h4>Development Curriculum</h4>
                {intelligence.curriculum.map((item) => (
                  <div key={item.domain} className={`dd-curriculum-card dd-priority-${item.priority}`}>
                    <div className="dd-curriculum-order">{item.order}</div>
                    <div className="dd-curriculum-info">
                      <span className="dd-curriculum-name">{item.module_name}</span>
                      <span className="dd-curriculum-domain">{item.domain_label}</span>
                      <p className="dd-curriculum-rationale">{item.rationale}</p>
                      <span className="dd-curriculum-time">{item.estimated_time}</span>
                      {item.dependencies.length > 0 && (
                        <span className="dd-curriculum-deps">
                          Prerequisite: {item.dependencies.map((domainKey) => domainLabel(domainKey, ddData.domains)).join(', ')}
                        </span>
                      )}
                    </div>
                    <span className={`dd-priority-badge dd-priority-${item.priority}`}>{item.priority}</span>
                  </div>
                ))}
              </div>

              <div className="dd-results-actions">
                <button
                  className="hero-button"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      document.getElementById('development')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                >
                  View Development Path
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    void trackCtaClick('view_curriculum', 'deep_dive_results', user?.id ?? null);
                    onClose();
                    navigate('/curriculum');
                  }}
                >
                  View Curriculum
                </button>
                <button className="ghost-button" onClick={() => { reset(); setScreen('question'); }}>
                  Retake Deep Dive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
