import { lazy, Suspense, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthModal } from './components/Auth/AuthModal';
import { Nav } from './components/Nav/Nav';
import { Hero } from './components/Hero/Hero';
import { AssessmentSection } from './components/Assessment/AssessmentSection';
import { ArchetypesSection } from './components/Archetypes/ArchetypesSection';
import { DashboardSection } from './components/Dashboard/DashboardSection';
import { AboutSection } from './components/About/AboutSection';
import { QuickPulseOverlay, loadSavedResult } from './components/QuickPulse/QuickPulseOverlay';
import { DeepDiveOverlay, loadSavedDeepDiveResult } from './components/DeepDive/DeepDiveOverlay';
import { LlmMirrorOverlay } from './components/LlmMirror/LlmMirrorOverlay';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ToastProvider } from './contexts/ToastContext';
import { trackPageView } from './lib/analytics';
import { initPostHog } from './lib/posthog';
import { computeBalanceIndex } from './lib/scoring';
import { assessmentModes } from './data/assessments';
import type { AssessmentMode, AssessmentResult, ArchetypeKey, DomainScores } from './types';
import './components/common/ErrorBoundary.css';
import './styles/global.css';

// Initialize PostHog analytics (no-op if VITE_POSTHOG_KEY is not set)
initPostHog();

// Lazy-loaded route components — split into separate chunks
const ResultsPage = lazy(() => import('./components/Results/ResultsPage').then(m => ({ default: m.ResultsPage })));
const CurriculumPage = lazy(() => import('./components/Curriculum/CurriculumPage').then(m => ({ default: m.CurriculumPage })));
const CourseOverview = lazy(() => import('./components/Curriculum/CourseOverview').then(m => ({ default: m.CourseOverview })));
const LessonView = lazy(() => import('./components/Curriculum/LessonView').then(m => ({ default: m.LessonView })));
const HistoryPage = lazy(() => import('./components/History/HistoryPage').then(m => ({ default: m.HistoryPage })));
const ProfilePage = lazy(() => import('./components/Profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const PricingPage = lazy(() => import('./components/Pricing/PricingPage').then(m => ({ default: m.PricingPage })));
const CoachingPage = lazy(() => import('./components/Coaching/CoachingPage').then(m => ({ default: m.CoachingPage })));

function LazyFallback() {
  return (
    <main id="main-content">
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="summary-card"><p style={{ color: 'var(--muted)' }}>Loading…</p></div>
      </div>
    </main>
  );
}

function AppFrame({
  children,
  onGetStarted,
}: {
  children: ReactNode;
  onGetStarted: () => void;
}) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <Nav onGetStarted={onGetStarted} onOpenAuth={() => setAuthOpen(true)} />
      {children}
      <footer>
        <div className="container footer-grid">
          <div className="footer-brand">
            <strong>Renaissance Skills</strong>
            <span>Cross-domain skill assessment and development for the AI era.</span>
          </div>
          <div className="footer-col">
            <span className="footer-heading">Product</span>
            <a href="/#assessment">Assessment</a>
            <a href="/curriculum">Curriculum</a>
            <a href="/pricing">Pricing</a>
          </div>
          <div className="footer-col">
            <span className="footer-heading">Account</span>
            <a href="/profile">Profile</a>
            <a href="/history">History</a>
            <a href="/coaching">Coaching</a>
          </div>
          <div className="footer-col">
            <span className="footer-heading">Support</span>
            <a href="mailto:support@renaissanceskills.com">Contact</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>&copy; 2026 Renaissance Skills. All rights reserved.</span>
        </div>
      </footer>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

function RouteAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPathRef = useRef('');

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (lastPathRef.current === path) {
      return;
    }

    lastPathRef.current = path;
    void trackPageView(path, user?.id ?? null);
  }, [location.hash, location.pathname, location.search, user?.id]);

  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <main id="main-content">
        <div className="container" style={{ padding: '5rem 0' }}>
          <div className="summary-card">
            <h2>Loading your account…</h2>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function HomePage() {
  const { loading, user } = useAuth();
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('quick');
  const [qpOpen, setQpOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<ArchetypeKey>('strategist');
  const location = useLocation();
  const navigate = useNavigate();

  const current = assessmentModes[assessmentMode];
  const profile = current.profile;
  const weakest = Object.entries(profile)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([name]) => name);

  // Convert display-name keys to domain keys for balance computation
  const domainScores: DomainScores = {
    leadership: profile['Leadership'] ?? 50,
    creativity: profile['Creativity'] ?? 50,
    strategy: profile['Strategy'] ?? 50,
    tech_proficiency: profile['Tech Proficiency'] ?? 50,
    problem_solving: profile['Problem Solving'] ?? 50,
    critical_thinking: profile['Critical Thinking'] ?? 50,
    adaptability: profile['Adaptability'] ?? 50,
    data_analysis: profile['Data Analysis'] ?? 50,
  };
  const balance = computeBalanceIndex(domainScores);

  const handleStartAssessment = useCallback(() => {
    setQpOpen(true);
  }, []);

  const handleStartDeepDive = useCallback(() => {
    setDdOpen(true);
  }, []);

  const handleStartMirror = useCallback(() => {
    setMirrorOpen(true);
  }, []);

  const handleAssessmentComplete = useCallback((result: AssessmentResult) => {
    setActiveArchetype(result.archetype.key);
  }, []);

  const handleDeepDiveComplete = useCallback((result: AssessmentResult) => {
    setActiveArchetype(result.archetype.key);
  }, []);

  const handleMirrorComplete = useCallback((result: AssessmentResult) => {
    setActiveArchetype(result.archetype.key);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const savedQuickPulse = loadSavedResult();
    const savedDeepDive = loadSavedDeepDiveResult();

    const saved = [savedQuickPulse, savedDeepDive]
      .filter((result): result is AssessmentResult => Boolean(result))
      .sort((left, right) => {
        return new Date(right.completed_at).getTime() - new Date(left.completed_at).getTime();
      })[0];

    if (saved?.archetype) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveArchetype(saved.archetype.key);
    }
  }, [loading, user?.id]);

  useEffect(() => {
    const state = location.state as { openQuickPulse?: boolean } | null;
    if (!state?.openQuickPulse) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQpOpen(true);
    navigate('/', { replace: true });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const element = document.querySelector(location.hash);
    if (!element) {
      return;
    }

    const timer = window.setTimeout(() => {
      const top = element.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [assessmentMode]);

  return (
    <>
      <AppFrame onGetStarted={handleStartAssessment}>
        <main id="main-content">
          <Hero profile={profile} onStartAssessment={handleStartAssessment} />
          <AssessmentSection
            currentMode={assessmentMode}
            onSelectMode={setAssessmentMode}
            onStartQuickPulse={handleStartAssessment}
            onStartDeepDive={handleStartDeepDive}
            onStartMirror={handleStartMirror}
          />
          <ArchetypesSection
            activeArchetype={activeArchetype}
            onSelectArchetype={setActiveArchetype}
          />
          <DashboardSection
            assessment={current}
            balanceIndex={balance}
            weakestDomains={weakest}
          />
          <AboutSection />
        </main>
      </AppFrame>

      <QuickPulseOverlay
        isOpen={qpOpen}
        onClose={() => setQpOpen(false)}
        onComplete={handleAssessmentComplete}
      />
      <DeepDiveOverlay
        isOpen={ddOpen}
        onClose={() => setDdOpen(false)}
        onComplete={handleDeepDiveComplete}
      />
      <LlmMirrorOverlay
        isOpen={mirrorOpen}
        onClose={() => setMirrorOpen(false)}
        onComplete={handleMirrorComplete}
      />
    </>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <Suspense fallback={<LazyFallback />}>{children}</Suspense>
    </AppFrame>
  );
}

function AuthLazyRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <RequireAuth>
        <Suspense fallback={<LazyFallback />}>{children}</Suspense>
      </RequireAuth>
    </AppFrame>
  );
}

function AppRoutes() {
  return (
    <>
      <RouteAnalytics />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<LazyRoute><ResultsPage /></LazyRoute>} />
        <Route path="/curriculum" element={<LazyRoute><CurriculumPage /></LazyRoute>} />
        <Route path="/curriculum/:courseId" element={<LazyRoute><CourseOverview /></LazyRoute>} />
        <Route path="/curriculum/:courseId/:lessonId" element={<LazyRoute><LessonView /></LazyRoute>} />
        <Route path="/history" element={<AuthLazyRoute><HistoryPage /></AuthLazyRoute>} />
        <Route path="/profile" element={<AuthLazyRoute><ProfilePage /></AuthLazyRoute>} />
        <Route path="/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
        <Route path="/coaching" element={<AuthLazyRoute><CoachingPage /></AuthLazyRoute>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
