import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
import { ResultsPage } from './components/Results/ResultsPage';
import { CurriculumPage } from './components/Curriculum/CurriculumPage';
import { CourseOverview } from './components/Curriculum/CourseOverview';
import { LessonView } from './components/Curriculum/LessonView';
import { HistoryPage } from './components/History/HistoryPage';
import { ProfilePage } from './components/Profile/ProfilePage';
import { PricingPage } from './components/Pricing/PricingPage';
import { CoachingPage } from './components/Coaching/CoachingPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { trackPageView } from './lib/analytics';
import { computeBalanceIndex } from './lib/scoring';
import { assessmentModes } from './data/assessments';
import type { AssessmentMode, AssessmentResult, ArchetypeKey, DomainScores } from './types';
import './components/common/ErrorBoundary.css';
import './styles/global.css';

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
        <div className="container footer-row">
          <span>Renaissance Skills</span>
          <span>Vite + React + TypeScript</span>
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

  const handleAssessmentComplete = useCallback((result: AssessmentResult) => {
    setActiveArchetype(result.archetype.key);
  }, []);

  const handleDeepDiveComplete = useCallback((result: AssessmentResult) => {
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
    </>
  );
}

function ResultsRoute() {
  const navigate = useNavigate();
  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <ResultsPage />
    </AppFrame>
  );
}

function CurriculumRoute() {
  const navigate = useNavigate();
  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <CurriculumPage />
    </AppFrame>
  );
}

function CourseOverviewRoute() {
  const navigate = useNavigate();
  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <CourseOverview />
    </AppFrame>
  );
}

function LessonRoute() {
  const navigate = useNavigate();
  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <LessonView />
    </AppFrame>
  );
}

function HistoryRoute() {
  const navigate = useNavigate();

  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <RequireAuth>
        <HistoryPage />
      </RequireAuth>
    </AppFrame>
  );
}

function ProfileRoute() {
  const navigate = useNavigate();

  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <RequireAuth>
        <ProfilePage />
      </RequireAuth>
    </AppFrame>
  );
}

function PricingRoute() {
  const navigate = useNavigate();

  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <PricingPage />
    </AppFrame>
  );
}

function CoachingRoute() {
  const navigate = useNavigate();

  return (
    <AppFrame onGetStarted={() => navigate('/', { state: { openQuickPulse: true } })}>
      <RequireAuth>
        <CoachingPage />
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
        <Route path="/results" element={<ResultsRoute />} />
        <Route path="/curriculum" element={<CurriculumRoute />} />
        <Route path="/curriculum/:courseId" element={<CourseOverviewRoute />} />
        <Route path="/curriculum/:courseId/:lessonId" element={<LessonRoute />} />
        <Route path="/history" element={<HistoryRoute />} />
        <Route path="/profile" element={<ProfileRoute />} />
        <Route path="/pricing" element={<PricingRoute />} />
        <Route path="/coaching" element={<CoachingRoute />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <AppRoutes />
        </SubscriptionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
