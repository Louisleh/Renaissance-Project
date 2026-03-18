import { useEffect, useState } from 'react';
import { curriculumCourses } from '../../data/curriculum';
import { generateProfileIntelligence } from '../../lib/profile-intelligence';
import { ensureCurriculumProgress } from '../../lib/curriculum-progress';
import { loadAssessmentResult, loadCurriculumProgress, saveCurriculumProgress } from '../../lib/data-sync';
import { useAuth } from '../../contexts/AuthContext';
import type { AssessmentResult, CurriculumProgress, ProfileIntelligence } from '../../types';

export interface CurriculumState {
  result: AssessmentResult;
  intelligence: ProfileIntelligence;
  progress: CurriculumProgress;
}

export function loadCurriculumState(): CurriculumState | null {
  const result = loadAssessmentResult('quick_pulse');
  if (!result) {
    return null;
  }

  const intelligence = generateProfileIntelligence(result);
  const progress = ensureCurriculumProgress(loadCurriculumProgress(), result, intelligence.curriculum, curriculumCourses);

  return {
    result,
    intelligence,
    progress,
  };
}

export function useCurriculumState() {
  const { loading, user } = useAuth();
  const [curriculumState, setCurriculumState] = useState<CurriculumState | null>(() => {
    return loading ? null : loadCurriculumState();
  });

  useEffect(() => {
    if (loading) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurriculumState(loadCurriculumState());
  }, [loading, user?.id]);

  useEffect(() => {
    if (curriculumState) {
      void saveCurriculumProgress(curriculumState.progress, user?.id ?? null);
    }
  }, [curriculumState, user?.id]);

  return { curriculumState, setCurriculumState };
}
