import { useEffect, useMemo, useState } from 'react';
import moduleData from '../../data/quick-pulse-module.json';
import { useAuth } from '../../contexts/AuthContext';
import { UpgradeGate } from '../common/UpgradeGate';
import { configuredCalendlyUrl } from '../../lib/stripe';
import { loadAssessmentResult } from '../../lib/data-sync';
import { loadCoachingRequests, submitCoachingRequest } from '../../lib/coaching';
import type { AssessmentResult, CoachingRequest, QuickPulseModule } from '../../types';
import './CoachingPage.css';

const qpData = moduleData as unknown as QuickPulseModule;

interface SessionOption {
  key: 'profile_review' | 'growth_sprint';
  title: string;
  duration: string;
  price: string;
  description: string;
}

const sessionOptions: SessionOption[] = [
  {
    key: 'profile_review',
    title: 'Profile Review',
    duration: '30 min',
    price: 'Included with Premium',
    description: 'Review your current profile, archetype, and weak-domain priorities together.',
  },
  {
    key: 'growth_sprint',
    title: 'Growth Sprint',
    duration: '60 min',
    price: '$95 session',
    description: 'Design a tighter 30-day development plan with reading, pacing, and accountability.',
  },
];

function formatDomain(domain: string): string {
  const domainLabel = qpData.domains.find((item) => item.key === domain)?.label;
  return domainLabel ?? domain.replace('_', ' ');
}

export function CoachingPage() {
  const { user } = useAuth();
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionOption['key']>('profile_review');
  const [preferredTimes, setPreferredTimes] = useState('');
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLatestResult(loadAssessmentResult('deep_dive') ?? loadAssessmentResult('quick_pulse'));
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void loadCoachingRequests(user.id).then((entries) => {
      setRequests(entries);
    });
  }, [user?.id]);

  const focusAreas = useMemo(() => {
    if (!latestResult) {
      return 'Leadership, strategy, and generalist balance';
    }

    return latestResult.growth_domains.map((domain) => formatDomain(domain)).join(', ');
  }, [latestResult]);

  const handleBook = async () => {
    if (configuredCalendlyUrl) {
      window.open(configuredCalendlyUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!user?.id) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const { error } = await submitCoachingRequest({
      userId: user.id,
      sessionType: selectedSession,
      preferredTimes,
      focusAreas,
      assessmentSummary: latestResult,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Coaching request submitted. We will follow up by email.');
      setPreferredTimes('');
      const nextRequests = await loadCoachingRequests(user.id);
      setRequests(nextRequests);
    }

    setSubmitting(false);
  };

  return (
    <main className="coaching-page" id="main-content">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Premium Coaching</div>
          <h1>1-on-1 Renaissance coaching</h1>
          <p className="lede">
            Convert your profile signal into a real operating plan with a structured coaching conversation focused on growth, synthesis, and accountability.
          </p>
        </div>

        <UpgradeGate feature="coaching">
          <div className="coaching-stack">
            <section className="coaching-panel">
              <div className="coaching-kicker">Your Profile Summary</div>
              {latestResult ? (
                <>
                  <h2>{latestResult.archetype.label} • Balance {latestResult.balance_index}</h2>
                  <p>Focus areas: {focusAreas}</p>
                </>
              ) : (
                <>
                  <h2>Assessment needed</h2>
                  <p>Complete Quick Pulse or Deep Dive to attach a profile snapshot to your coaching request.</p>
                </>
              )}
            </section>

            <section className="coaching-grid">
              {sessionOptions.map((option) => (
                <article
                  key={option.key}
                  className={`coaching-card${selectedSession === option.key ? ' is-active' : ''}`}
                >
                  <div className="coaching-kicker">{option.duration}</div>
                  <h3>{option.title}</h3>
                  <strong>{option.price}</strong>
                  <p>{option.description}</p>
                  <button className="ghost-button" onClick={() => setSelectedSession(option.key)}>
                    {selectedSession === option.key ? 'Selected' : 'Choose'}
                  </button>
                </article>
              ))}
            </section>

            <section className="coaching-panel">
              <div className="coaching-kicker">What to Expect</div>
              <ul className="coaching-list">
                <li>Review your assessment results together.</li>
                <li>Identify blind spots and over-specialization risks.</li>
                <li>Set a 30-day development target sequence.</li>
                <li>Receive personalized reading and practice suggestions.</li>
              </ul>
            </section>

            {!configuredCalendlyUrl && (
              <section className="coaching-panel">
                <div className="coaching-kicker">Request a Session</div>
                <p className="coaching-copy">
                  Calendly is not configured here, so this request will be saved for manual follow-up.
                </p>
                <label className="coaching-label" htmlFor="coaching-times">Preferred times</label>
                <textarea
                  id="coaching-times"
                  className="coaching-textarea"
                  value={preferredTimes}
                  onChange={(event) => setPreferredTimes(event.target.value)}
                  placeholder="Share a few windows that work for you this week."
                />
              </section>
            )}

            <div className="coaching-actions">
              <button className="hero-button" onClick={handleBook} disabled={submitting}>
                {submitting ? 'Submitting…' : configuredCalendlyUrl ? 'Book →' : 'Request Session →'}
              </button>
              {message && <p className="coaching-message">{message}</p>}
            </div>

            {requests.length > 0 && (
              <section className="coaching-panel">
                <div className="coaching-kicker">Existing Requests</div>
                <div className="coaching-requests">
                  {requests.map((request) => (
                    <div key={request.id} className="coaching-request">
                      <strong>{request.session_type === 'profile_review' ? 'Profile Review' : 'Growth Sprint'}</strong>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      <span>Status: {request.status}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </UpgradeGate>
      </div>
    </main>
  );
}
