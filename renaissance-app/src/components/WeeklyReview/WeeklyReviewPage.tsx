import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ensureCardsLoaded } from '../../data/flashcards';
import { computeWeeklySummary, markWeeklyReviewComplete } from '../../lib/progression/weekly-review';
import { appendCommonplaceEntry } from '../../lib/progression/commonplace';
import { trackCommonplaceSubmitted } from '../../lib/analytics';
import './WeeklyReviewPage.css';

export function WeeklyReviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureCardsLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => (ready ? computeWeeklySummary() : null), [ready]);

  if (!ready || !summary) {
    return (
      <main id="main-content" className="weekly-review-main">
        <div className="container">
          <p style={{ color: 'var(--muted)' }}>Loading your week…</p>
        </div>
      </main>
    );
  }

  const weekLabel = summary.weekStart.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const handleSubmit = async () => {
    const body = reflection.trim();
    if (body.length === 0) {
      markWeeklyReviewComplete();
      navigate('/journey');
      return;
    }
    setSaving(true);
    await appendCommonplaceEntry(
      {
        prompt_id: 'weekly_review',
        prompt_text: 'Weekly review — what shifted this week?',
        body,
        domain_hint: null,
      },
      user?.id ?? null,
    );
    void trackCommonplaceSubmitted('weekly_review', body.length, null, user?.id ?? null);
    markWeeklyReviewComplete();
    setSaving(false);
    navigate('/journey');
  };

  return (
    <main id="main-content" className="weekly-review-main">
      <div className="container weekly-review-shell">
        <header className="weekly-review-header">
          <span className="weekly-review-eyebrow">Weekly Review · week of {weekLabel}</span>
          <h1 className="weekly-review-page-title">Look back to look forward</h1>
          <p className="weekly-review-lede">
            A deliberate ritual: see the shape of the week, re-surface what is slipping, write one paragraph
            that will make sense again a year from now.
          </p>
        </header>

        <section className="weekly-review-grid">
          <div className="weekly-review-stat">
            <span className="weekly-review-stat-label">Cards reviewed</span>
            <span className="weekly-review-stat-value">{summary.cardsReviewed}</span>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-stat-label">Retention</span>
            <span className="weekly-review-stat-value">
              {summary.retentionPct === null ? '—' : `${summary.retentionPct}%`}
            </span>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-stat-label">Domains touched</span>
            <span className="weekly-review-stat-value">{summary.domainsTouched.length}</span>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-stat-label">Streak</span>
            <span className="weekly-review-stat-value">{summary.streak}d</span>
          </div>
        </section>

        <section className="weekly-review-section">
          <h2>What is strongest</h2>
          <ul className="weekly-review-list">
            {summary.topDomains.map((d) => (
              <li key={d.domain}>
                <strong>{d.domain}</strong> · mastery {d.mastery} · {d.reviewedCount} reviewed
              </li>
            ))}
          </ul>
        </section>

        <section className="weekly-review-section">
          <h2>What is drifting</h2>
          {summary.strugglingDomains.length === 0 ? (
            <p className="weekly-review-empty">
              No domains to flag yet — complete a few sessions and this will start guiding your focus.
            </p>
          ) : (
            <ul className="weekly-review-list">
              {summary.strugglingDomains.map((d) => (
                <li key={d.domain}>
                  <strong>{d.domain}</strong> · mastery {d.mastery} · {d.reviewedCount} reviewed
                </li>
              ))}
            </ul>
          )}
        </section>

        {summary.resurfacedCards.length > 0 && (
          <section className="weekly-review-section">
            <h2>Cards worth re-reading</h2>
            <p className="weekly-review-hint">
              Picked from this week's lowest-rated reviews. Let them bubble back up in your next session.
            </p>
            <ul className="weekly-review-resurface">
              {summary.resurfacedCards.map((c) => (
                <li key={c.id}>
                  <span className="weekly-review-domain">{c.domain}</span>
                  <span className="weekly-review-concept">{c.concept}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.commonplaceEntries.length > 0 && (
          <section className="weekly-review-section">
            <h2>What you wrote</h2>
            <ul className="weekly-review-entries">
              {summary.commonplaceEntries.map((entry) => (
                <li key={entry.id}>
                  <p className="weekly-review-prompt">{entry.prompt_text}</p>
                  <p className="weekly-review-body">{entry.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="weekly-review-section weekly-review-reflect">
          <h2>Write one paragraph for your future self</h2>
          <p className="weekly-review-hint">
            What is the single most important thing you learned or noticed this week? Write it down now so you
            will recognize the shift a year from today.
          </p>
          <textarea
            className="weekly-review-textarea"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="This week I noticed…"
          />
          <div className="weekly-review-actions">
            <button
              type="button"
              className="hero-button"
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Close out the week'}
            </button>
            <button type="button" className="ghost-button" onClick={() => navigate('/journey')}>
              Skip
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
