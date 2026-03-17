import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Nav } from './components/Nav/Nav';
import { Hero } from './components/Hero/Hero';
import { AssessmentSection } from './components/Assessment/AssessmentSection';
import { ArchetypesSection } from './components/Archetypes/ArchetypesSection';
import { DashboardSection } from './components/Dashboard/DashboardSection';
import { AboutSection } from './components/About/AboutSection';
import { QuickPulseOverlay, loadSavedResult } from './components/QuickPulse/QuickPulseOverlay';
import { ResultsPage } from './components/Results/ResultsPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { computeBalanceIndex } from './lib/scoring';
import { assessmentModes } from './data/assessments';
import type { AssessmentMode, AssessmentResult, ArchetypeKey, DomainScores, ProfileIntelligence } from './types';
import './components/common/ErrorBoundary.css';
import './styles/global.css';

function HomePage() {
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('quick');
  const [qpOpen, setQpOpen] = useState(false);
  const [activeArchetype, setActiveArchetype] = useState<ArchetypeKey>('strategist');

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

  const handleAssessmentComplete = useCallback((result: AssessmentResult, _intel: ProfileIntelligence) => {
    setActiveArchetype(result.archetype.key);
  }, []);

  useEffect(() => {
    const saved = loadSavedResult();
    if (saved?.archetype) {
      setActiveArchetype(saved.archetype.key);
    }
  }, []);

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
      <Nav onGetStarted={handleStartAssessment} />
      <main id="main-content">
        <Hero profile={profile} onStartAssessment={handleStartAssessment} />
        <AssessmentSection
          currentMode={assessmentMode}
          onSelectMode={setAssessmentMode}
          onStartQuickPulse={handleStartAssessment}
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
      <footer>
        <div className="container footer-row">
          <span>Renaissance Skills</span>
          <span>Vite + React + TypeScript</span>
        </div>
      </footer>

      <QuickPulseOverlay
        isOpen={qpOpen}
        onClose={() => setQpOpen(false)}
        onComplete={handleAssessmentComplete}
      />
    </>
  );
}

function ResultsRoute() {
  const navigate = useNavigate();
  return (
    <>
      <Nav onGetStarted={() => navigate('/')} />
      <ResultsPage />
      <footer>
        <div className="container footer-row">
          <span>Renaissance Skills</span>
          <span>Vite + React + TypeScript</span>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsRoute />} />
      </Routes>
    </ErrorBoundary>
  );
}
