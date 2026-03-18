import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RadarChart } from '../RadarChart/RadarChart';
import {
  generateMirrorAnalysisPrompt,
  buildResultFromMirrorImport,
  extractMirrorReasoning,
  type MirrorReasoning,
} from '../../lib/llm-mirror';
import { generateProfileIntelligence } from '../../lib/profile-intelligence';
import { validateMirrorImport } from '../../lib/profile-intelligence';
import { domainLabel } from '../../lib/scoring';
import { generateResultsPdf } from '../../lib/pdf-export';
import { trackCtaClick, trackAssessmentCompleted } from '../../lib/analytics';
import { saveAssessmentResult } from '../../lib/data-sync';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import moduleData from '../../data/quick-pulse-module.json';
import type { QuickPulseModule, AssessmentResult, ProfileIntelligence, DomainKey } from '../../types';
import './LlmMirrorOverlay.css';

const qpData = moduleData as unknown as QuickPulseModule;

interface LlmMirrorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult) => void;
}

type Screen = 'intro' | 'prompt' | 'import' | 'results';

function AnimatedScore({ value }: { value: number }) {
  const animated = useAnimatedCounter(value, 1200, true);
  return <span className="lm-domain-score">{animated}</span>;
}

function AnimatedBalance({ value }: { value: number }) {
  const animated = useAnimatedCounter(value, 1400, true);
  return <div className="lm-balance-number">{animated}</div>;
}

export function LlmMirrorOverlay({ isOpen, onClose, onComplete }: LlmMirrorOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Screen>('intro');
  const [jsonInput, setJsonInput] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [intelligence, setIntelligence] = useState<ProfileIntelligence | null>(null);
  const [reasoning, setReasoning] = useState<MirrorReasoning | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const reset = useCallback(() => {
    setScreen('intro');
    setJsonInput('');
    setParseErrors([]);
    setParseWarnings([]);
    setResult(null);
    setIntelligence(null);
    setReasoning(null);
    setPromptCopied(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
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

  const handleCopyPrompt = () => {
    const prompt = generateMirrorAnalysisPrompt();
    void navigator.clipboard.writeText(prompt);
    void trackCtaClick('copy_mirror_prompt', 'llm_mirror', user?.id ?? null);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  const handleImport = () => {
    setParseErrors([]);
    setParseWarnings([]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setParseErrors(['Invalid JSON. Make sure you copied the entire output from your LLM.']);
      return;
    }

    const validation = validateMirrorImport(parsed);
    if (!validation.valid) {
      setParseErrors(validation.errors);
      setParseWarnings(validation.warnings);
      return;
    }

    if (validation.warnings.length > 0) {
      setParseWarnings(validation.warnings);
    }

    const importedJson = parsed as { scores: Record<string, number>; reasoning?: Record<string, string> };
    const r = buildResultFromMirrorImport(importedJson);
    const intel = generateProfileIntelligence(r);
    const mirrorReasoning = extractMirrorReasoning(importedJson);

    setResult(r);
    setIntelligence(intel);
    setReasoning(mirrorReasoning);

    void saveAssessmentResult('llm_mirror', r, intel, user?.id ?? null);
    void trackAssessmentCompleted('llm_mirror', r.archetype.key, r.balance_index, user?.id ?? null);
    onComplete(r);
    setScreen('results');
  };

  if (!isOpen) return null;

  return (
    <div className="lm-overlay is-open" role="dialog" aria-modal="true" aria-label="LLM Mirror Assessment">
      <div className="lm-container" ref={containerRef} tabIndex={-1}>
        <div className="lm-header">
          <span className="lm-header-brand">LLM Mirror</span>
          <button className="lm-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Intro Screen */}
        {screen === 'intro' && (
          <div className="lm-screen is-active lm-screen-enter">
            <div className="lm-intro">
              <div className="eyebrow">The LLM Mirror</div>
              <h2>Privacy-First Behavioral Profiling</h2>
              <p className="lm-intro-body">
                Use your own LLM to analyze your conversational history privately.
                No chat data ever leaves your device — you only paste back the summarized scores.
              </p>
              <div className="lm-steps">
                <div className="lm-step">
                  <span className="lm-step-num">1</span>
                  <div>
                    <strong>Copy the analysis prompt</strong>
                    <p>We generate a structured prompt that tells your LLM exactly what to look for.</p>
                  </div>
                </div>
                <div className="lm-step">
                  <span className="lm-step-num">2</span>
                  <div>
                    <strong>Run it with your chat history</strong>
                    <p>Paste the prompt into ChatGPT, Claude, or any LLM, then paste in your conversation exports.</p>
                  </div>
                </div>
                <div className="lm-step">
                  <span className="lm-step-num">3</span>
                  <div>
                    <strong>Paste back the JSON output</strong>
                    <p>Copy the JSON your LLM returns and paste it here for instant scoring and profiling.</p>
                  </div>
                </div>
              </div>
              <button className="lm-start-btn" onClick={() => setScreen('prompt')}>
                Get Started
              </button>
              <button className="lm-back-link" onClick={onClose}>
                Back to Assessment Modes
              </button>
            </div>
          </div>
        )}

        {/* Prompt Screen */}
        {screen === 'prompt' && (
          <div className="lm-screen is-active lm-screen-enter">
            <div className="lm-prompt-screen">
              <div className="eyebrow">Step 1 of 2</div>
              <h2>Copy the Analysis Prompt</h2>
              <p className="lm-prompt-desc">
                Copy this prompt and paste it into your preferred LLM. Then paste your conversation
                history below the dashed line in the prompt. The LLM will output a JSON profile.
              </p>

              <div className="lm-prompt-preview">
                <pre>{generateMirrorAnalysisPrompt().slice(0, 400)}…</pre>
              </div>

              <button className="lm-copy-btn" onClick={handleCopyPrompt}>
                {promptCopied ? 'Copied to Clipboard!' : 'Copy Full Prompt'}
              </button>

              <div className="lm-prompt-tips">
                <h4>Tips for best results</h4>
                <ul>
                  <li>Use a substantial conversation — 20+ messages gives the best signal</li>
                  <li>Work conversations reveal different domains than personal ones</li>
                  <li>You can run this multiple times with different conversation sets</li>
                  <li>The LLM will output raw JSON — copy everything between the curly braces</li>
                </ul>
              </div>

              <div className="lm-nav">
                <button className="ghost-button" onClick={() => setScreen('intro')}>Back</button>
                <button className="hero-button" onClick={() => setScreen('import')}>
                  I Have My JSON Output →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Screen */}
        {screen === 'import' && (
          <div className="lm-screen is-active lm-screen-enter">
            <div className="lm-import-screen">
              <div className="eyebrow">Step 2 of 2</div>
              <h2>Paste Your LLM Output</h2>
              <p className="lm-import-desc">
                Paste the JSON that your LLM returned. It should contain a <code>scores</code> object
                with values for all 8 domains.
              </p>

              <div className="lm-json-example">
                <h4>Expected format:</h4>
                <pre>{`{
  "scores": {
    "leadership": 72,
    "creativity": 65,
    "strategy": 80,
    ...
  },
  "reasoning": { ... }
}`}</pre>
              </div>

              <textarea
                className="lm-json-input"
                placeholder='Paste your JSON here...'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={12}
                spellCheck={false}
              />

              {parseErrors.length > 0 && (
                <div className="lm-errors">
                  {parseErrors.map((err, i) => (
                    <div key={i} className="lm-error-item">{err}</div>
                  ))}
                </div>
              )}

              {parseWarnings.length > 0 && parseErrors.length === 0 && (
                <div className="lm-warnings">
                  {parseWarnings.map((w, i) => (
                    <div key={i} className="lm-warning-item">{w}</div>
                  ))}
                </div>
              )}

              <div className="lm-nav">
                <button className="ghost-button" onClick={() => setScreen('prompt')}>Back</button>
                <button
                  className="hero-button"
                  onClick={handleImport}
                  disabled={!jsonInput.trim()}
                >
                  Score My Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {screen === 'results' && result && intelligence && (
          <div className="lm-screen is-active lm-results-enter">
            <div className="lm-results">
              <div className="lm-results-header">
                <div className="eyebrow">Your LLM Mirror Profile</div>
                <h2>Behavioral Analysis Complete</h2>
                <p className="lm-results-confidence">Synthesized from conversational evidence</p>
              </div>

              {/* Archetype */}
              <div className="lm-archetype-result lm-stagger-1">
                <span className="archetype-tag">{result.archetype.label}</span>
                <h3>{result.archetype.label}</h3>
                <p>{result.archetype.description}</p>
                <p className="lm-archetype-confidence">
                  Confidence: {Math.round(result.archetype.confidence * 100)}%
                </p>
              </div>

              {/* Profile Analysis */}
              <div className="lm-intelligence-card lm-stagger-2">
                <h4>Profile Analysis</h4>
                <p>{intelligence.narrative.summary}</p>
                <div className="lm-intel-section">
                  <h5>Growth Priority</h5>
                  <p>{intelligence.narrative.growth_priority}</p>
                </div>
              </div>

              {/* Radar + Domain Scores */}
              <div className="lm-radar-section lm-stagger-3">
                <div className="lm-radar-wrap">
                  <RadarChart
                    labels={qpData.domains.map(d => d.label)}
                    values={qpData.domains.map(d => result.scores[d.key])}
                    showLabels={true}
                    animated={true}
                  />
                </div>
                <div className="lm-domain-list">
                  {qpData.domains.map((d, i) => (
                    <div
                      key={d.key}
                      className="lm-domain-row"
                      style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                    >
                      <div className="lm-domain-head">
                        <span className="lm-domain-name">{d.label}</span>
                        <span>
                          <AnimatedScore value={result.scores[d.key]} />{' '}
                          <span className="lm-domain-level">{result.levels[d.key]}</span>
                        </span>
                      </div>
                      <div className="lm-domain-bar">
                        <div
                          className="lm-domain-fill lm-bar-animate"
                          style={{
                            '--bar-width': `${result.scores[d.key]}%`,
                            animationDelay: `${0.4 + i * 0.1}s`,
                          } as CSSProperties}
                        />
                      </div>
                      {reasoning && reasoning[d.key] && (
                        <p className="lm-domain-reasoning">{reasoning[d.key]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths / Growth */}
              <div className="lm-sg-grid lm-stagger-4">
                <div className="lm-sg-card">
                  <h4>Top Strengths</h4>
                  <div className="lm-sg-list">
                    {result.top_strengths.map(key => (
                      <div key={key} className="lm-sg-item lm-strength-item">
                        <span className="lm-sg-indicator lm-sg-strength-dot" />
                        {domainLabel(key, qpData.domains)} — {result.scores[key]} ({result.levels[key]})
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lm-sg-card">
                  <h4>Growth Domains</h4>
                  <div className="lm-sg-list">
                    {result.growth_domains.map(key => (
                      <div key={key} className="lm-sg-item lm-growth-item">
                        <span className="lm-sg-indicator lm-sg-growth-dot" />
                        {domainLabel(key, qpData.domains)} — {result.scores[key]} ({result.levels[key]})
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className="lm-balance-row lm-stagger-5">
                <AnimatedBalance value={result.balance_index} />
                <div className="lm-balance-info">
                  <h4>Balance Index</h4>
                  <p>{intelligence.balance_interpretation}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="lm-results-actions lm-stagger-6">
                <button className="hero-button" onClick={() => { onClose(); setTimeout(() => document.getElementById('development')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                  View Development Path
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    void trackCtaClick('view_curriculum', 'llm_mirror_results', user?.id ?? null);
                    onClose();
                    navigate('/curriculum');
                  }}
                >
                  View Curriculum
                </button>
                <button
                  className="ghost-button"
                  onClick={() => {
                    void trackCtaClick('download_pdf', 'llm_mirror_results', user?.id ?? null);
                    generateResultsPdf(result, intelligence, qpData.domains);
                  }}
                >
                  Download PDF
                </button>
                <button className="ghost-button" onClick={reset}>
                  Run Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
