import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import {
  deleteUserData,
  loadAssessmentHistory,
  loadCurriculumProgress,
  loadUserProfile,
  updateUserDisplayName,
} from '../../lib/data-sync';
import { getCompletionStats } from '../../lib/curriculum-progress';
import { openCustomerPortal } from '../../lib/stripe';
import { useToast } from '../../contexts/ToastContext';
import type { AssessmentHistoryEntry, CurriculumProgress, UserProfile } from '../../types';
import './ProfilePage.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, tier, openPricing } = useSubscription();
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [progress, setProgress] = useState<CurriculumProgress | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !user.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    setLoading(true);
    void Promise.all([
      loadUserProfile(user.id, user.email),
      loadAssessmentHistory(user.id),
    ])
      .then(([nextProfile, nextHistory]) => {
        setProfile(nextProfile);
        setDisplayName(nextProfile?.display_name ?? '');
        setHistory(nextHistory);
        setProgress(loadCurriculumProgress());
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.email, user?.id]);

  const latestAssessment = history[0] ?? null;
  const stats = useMemo(() => {
    return progress ? getCompletionStats(progress) : {
      totalLessons: 0,
      completedLessons: 0,
      percentComplete: 0,
      coursesStarted: 0,
      coursesCompleted: 0,
    };
  }, [progress]);

  const handleSaveDisplayName = async () => {
    if (!user?.id || !user.email || !displayName.trim()) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const nextProfile = await updateUserDisplayName(user.id, displayName.trim(), user.email);
    setProfile(nextProfile);
    setDisplayName(nextProfile?.display_name ?? displayName.trim());
    setSaving(false);
    setMessage('Display name updated.');
  };

  const handleDeleteData = async () => {
    if (!user?.id) {
      return;
    }

    const confirmed = window.confirm('Delete your synced assessment history and curriculum progress? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    await deleteUserData(user.id);
    setHistory([]);
    setProgress(null);
    setDisplayName('');
    setProfile((current) => current ? { ...current, display_name: '' } : current);
    setMessage('Your synced data was deleted. Local storage was cleared as well.');
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm('Open subscription management to modify your current plan?');
    if (!confirmed) {
      return;
    }

    const { error } = await openCustomerPortal();
    if (error) {
      toast.show(error, 'info');
    }
  };

  if (loading) {
    return (
      <main className="prof-page" id="main-content">
        <div className="container">
          <section className="prof-panel">
            <p>Loading your profile…</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="prof-page" id="main-content">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Profile</div>
          <h1>Your account</h1>
          <p className="lede">
            Manage your identity, review your current profile signal, and keep long-term Renaissance growth under one account.
          </p>
        </div>

        <div className="prof-grid">
          <section className="prof-panel">
            <div className="prof-panel-head">
              <div>
                <div className="prof-kicker">Identity</div>
                <h2>Profile details</h2>
              </div>
              {latestAssessment && (
                <span className="prof-archetype-badge">{latestAssessment.result.archetype.label}</span>
              )}
            </div>

            <label className="prof-label" htmlFor="profile-display-name">Display name</label>
            <div className="prof-inline-edit">
              <input
                id="profile-display-name"
                className="prof-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <button
                className="ghost-button"
                onClick={handleSaveDisplayName}
                disabled={saving || !displayName.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div className="prof-field">
              <span className="prof-field-label">Email</span>
              <strong>{user?.email ?? '—'}</strong>
            </div>

            <div className="prof-field">
              <span className="prof-field-label">Member since</span>
              <strong>{profile ? new Date(profile.created_at).toLocaleDateString() : '—'}</strong>
            </div>

            <div className="prof-field">
              <span className="prof-field-label">Current balance index</span>
              <strong>{latestAssessment?.result.balance_index ?? '—'}</strong>
            </div>

            <div className="prof-field">
              <span className="prof-field-label">Current plan</span>
              <strong>{tier}</strong>
              {subscription.current_period_end && (
                <span className="prof-muted">
                  Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                  {subscription.cancel_at_period_end ? ' • set to cancel' : ''}
                </span>
              )}
            </div>

            {message && <p className="prof-message">{message}</p>}
          </section>

          <section className="prof-panel">
            <div className="prof-kicker">Stats</div>
            <h2>Current footprint</h2>
            <div className="prof-stats">
              <div className="prof-stat">
                <span>Assessments taken</span>
                <strong>{history.length}</strong>
              </div>
              <div className="prof-stat">
                <span>Lessons completed</span>
                <strong>{stats.completedLessons}</strong>
              </div>
              <div className="prof-stat">
                <span>Courses completed</span>
                <strong>{stats.coursesCompleted}</strong>
              </div>
            </div>

            {latestAssessment ? (
              <div className="prof-latest">
                <div className="prof-kicker">Latest result</div>
                <h3>{latestAssessment.result.archetype.label}</h3>
                <p>
                  Completed {new Date(latestAssessment.created_at).toLocaleDateString()} with a balance index of{' '}
                  {latestAssessment.result.balance_index}.
                </p>
              </div>
            ) : (
              <p className="prof-muted">No synced assessments yet.</p>
            )}
          </section>
        </div>

        <section className="prof-panel prof-danger-panel">
          <div>
            <div className="prof-kicker">Subscription</div>
            <h2>Manage your plan</h2>
            <p className="prof-muted">
              {tier === 'free'
                ? 'Upgrade to unlock Deep Dive, full curriculum access, and longitudinal tracking.'
                : 'Subscription management will be available shortly. Contact support@renaissanceskills.com for billing changes.'}
            </p>
          </div>
          <div className="prof-danger-actions">
            {tier === 'free' ? (
              <button className="hero-button" onClick={openPricing}>
                Upgrade Plan
              </button>
            ) : (
              <>
                <button
                  className="ghost-button"
                  onClick={async () => {
                    const { error } = await openCustomerPortal();
                    if (error) toast.show(error, 'info');
                  }}
                >
                  Manage Subscription
                </button>
                <button className="ghost-button" onClick={() => void handleCancelSubscription()}>
                  Cancel Subscription
                </button>
              </>
            )}
          </div>
        </section>

        <section className="prof-panel prof-danger-panel">
          <div>
            <div className="prof-kicker">Danger Zone</div>
            <h2>Delete my data</h2>
            <p className="prof-muted">
              This removes your synced assessment history, analytics footprint, and curriculum progress, then clears the
              local copy stored in this browser.
            </p>
          </div>
          <div className="prof-danger-actions">
            <button className="prof-danger-button" onClick={handleDeleteData}>
              Delete my data
            </button>
            <button className="ghost-button" onClick={() => navigate('/history')}>
              View History
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
