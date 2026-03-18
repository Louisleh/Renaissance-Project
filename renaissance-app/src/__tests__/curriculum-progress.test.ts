import { beforeEach, describe, expect, it } from 'vitest';
import { curriculumCourses, getCourseByDomain } from '../data/curriculum';
import {
  completeLesson,
  CURRICULUM_PROGRESS_KEY,
  ensureCurriculumProgress,
  getCompletionStats,
  getCourseLockState,
  initProgress,
  loadProgress,
  saveLessonNotes,
  saveProgress,
  shouldSuggestReassessment,
} from '../lib/curriculum-progress';
import type { AssessmentResult, CurriculumRecommendation, DomainScores } from '../types';

const baseRecommendations: CurriculumRecommendation[] = [
  {
    order: 1,
    domain: 'critical_thinking',
    domain_label: 'Critical Thinking',
    module_name: 'Assumption Testing',
    rationale: 'Strengthen evidence evaluation first.',
    estimated_time: '3 lessons',
    dependencies: [],
    priority: 'high',
  },
  {
    order: 2,
    domain: 'strategy',
    domain_label: 'Strategy',
    module_name: 'Systems Mapping and Leverage',
    rationale: 'Build stronger sequencing after reasoning improves.',
    estimated_time: '3 lessons',
    dependencies: ['critical_thinking'],
    priority: 'medium',
  },
  {
    order: 3,
    domain: 'leadership',
    domain_label: 'Leadership',
    module_name: 'Influence Through Clarity',
    rationale: 'Improve alignment and direction setting.',
    estimated_time: '4 lessons',
    dependencies: ['adaptability'],
    priority: 'medium',
  },
];

const domainScoresBelowFunctional: DomainScores = {
  leadership: 50,
  creativity: 70,
  strategy: 45,
  tech_proficiency: 62,
  problem_solving: 68,
  critical_thinking: 40,
  adaptability: 58,
  data_analysis: 52,
};

const domainScoresWithCriticalThinkingReady: DomainScores = {
  ...domainScoresBelowFunctional,
  critical_thinking: 64,
};

const assessmentResult: AssessmentResult = {
  assessment_id: 'quick_pulse_v1',
  assessment_name: 'The Quick Pulse',
  completed_at: '2026-03-17T00:00:00.000Z',
  response_count: 10,
  responses: [],
  scores: domainScoresBelowFunctional,
  levels: {
    leadership: 'Developing',
    creativity: 'Functional',
    strategy: 'Developing',
    tech_proficiency: 'Functional',
    problem_solving: 'Functional',
    critical_thinking: 'Emerging',
    adaptability: 'Developing',
    data_analysis: 'Developing',
  },
  top_strengths: ['creativity', 'problem_solving', 'tech_proficiency'],
  growth_domains: ['critical_thinking', 'strategy', 'leadership'],
  archetype: {
    key: 'strategist',
    label: 'The Strategist',
    description: 'A systems-oriented thinker.',
    confidence: 0.63,
  },
  balance_index: 57,
  recommended_modules: [
    'Assumption Testing',
    'Systems Mapping and Leverage',
    'Influence Through Clarity',
  ],
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('curriculum-progress', () => {
  it('initProgress creates entries for all recommended courses', () => {
    const progress = initProgress(baseRecommendations, curriculumCourses);

    expect(Object.keys(progress.courses)).toHaveLength(3);
    expect(progress.courses['critical_thinking_assumptions']).toBeDefined();
    expect(progress.courses['strategy_systems']).toBeDefined();
    expect(progress.courses['leadership_influence']).toBeDefined();
  });

  it('completeLesson marks lesson done and updates timestamp', () => {
    const progress = initProgress(baseRecommendations, curriculumCourses);
    const next = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_01');

    expect(next.courses['critical_thinking_assumptions'].lessons['critical_01_01'].completed).toBe(true);
    expect(next.courses['critical_thinking_assumptions'].lessons['critical_01_01'].completed_at).not.toBeNull();
  });

  it('completeLesson on last lesson marks course as completed', () => {
    let progress = initProgress(baseRecommendations, curriculumCourses);

    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_01');
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_02');
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_03');

    expect(progress.courses['critical_thinking_assumptions'].completed).toBe(true);
    expect(progress.courses['critical_thinking_assumptions'].completed_at).not.toBeNull();
  });

  it('saveLessonNotes persists notes correctly', () => {
    const progress = initProgress(baseRecommendations, curriculumCourses);
    const next = saveLessonNotes(
      progress,
      'strategy_systems',
      'strategy_01_01',
      'Map feedback loops before recommending action.'
    );

    expect(next.courses['strategy_systems'].lessons['strategy_01_01'].notes).toBe(
      'Map feedback loops before recommending action.'
    );
  });

  it('getCompletionStats returns accurate counts and percentages', () => {
    let progress = initProgress(baseRecommendations, curriculumCourses);
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_01');
    progress = completeLesson(progress, 'strategy_systems', 'strategy_01_01');

    const stats = getCompletionStats(progress);

    expect(stats.totalLessons).toBe(10);
    expect(stats.completedLessons).toBe(2);
    expect(stats.percentComplete).toBe(20);
    expect(stats.coursesStarted).toBe(3);
    expect(stats.coursesCompleted).toBe(0);
  });

  it('shouldSuggestReassessment returns false with no completed courses', () => {
    const progress = initProgress(baseRecommendations, curriculumCourses);
    expect(shouldSuggestReassessment(progress)).toBe(false);
  });

  it('shouldSuggestReassessment returns true with 1+ completed course', () => {
    let progress = initProgress(baseRecommendations, curriculumCourses);
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_01');
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_02');
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_03');

    expect(shouldSuggestReassessment(progress)).toBe(true);
  });

  it('loadProgress and saveProgress round-trip through localStorage correctly', () => {
    const progress = initProgress(baseRecommendations, curriculumCourses);
    saveProgress(progress);

    const loaded = loadProgress();
    expect(loaded).toEqual(progress);
    expect(window.localStorage.getItem(CURRICULUM_PROGRESS_KEY)).toBeTruthy();
  });

  it('course locking shows locked when prerequisite is incomplete and score is below 60', () => {
    const progress = initProgress(baseRecommendations, curriculumCourses);
    const strategyCourse = getCourseByDomain('strategy');

    expect(strategyCourse).toBeDefined();

    const lockState = getCourseLockState(
      strategyCourse!,
      progress,
      domainScoresBelowFunctional,
      curriculumCourses
    );

    expect(lockState.locked).toBe(true);
    expect(lockState.unmetPrerequisites).toEqual(['critical_thinking']);
  });

  it('course unlocks when prerequisite course is completed OR domain score is >= 60', () => {
    let progress = initProgress(baseRecommendations, curriculumCourses);
    const strategyCourse = getCourseByDomain('strategy');

    expect(strategyCourse).toBeDefined();

    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_01');
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_02');
    progress = completeLesson(progress, 'critical_thinking_assumptions', 'critical_01_03');

    const unlockedByCourse = getCourseLockState(
      strategyCourse!,
      progress,
      domainScoresBelowFunctional,
      curriculumCourses
    );
    expect(unlockedByCourse.locked).toBe(false);

    const freshProgress = initProgress(baseRecommendations, curriculumCourses);
    const unlockedByScore = getCourseLockState(
      strategyCourse!,
      freshProgress,
      domainScoresWithCriticalThinkingReady,
      curriculumCourses
    );
    expect(unlockedByScore.locked).toBe(false);
  });

  it('ensureCurriculumProgress preserves progress and stores reassessment comparison snapshots', () => {
    let progress = ensureCurriculumProgress(null, assessmentResult, baseRecommendations, curriculumCourses);
    expect(progress.baseline_scores).toEqual(assessmentResult.scores);
    expect(progress.latest_scores).toEqual(assessmentResult.scores);

    const retake: AssessmentResult = {
      ...assessmentResult,
      completed_at: '2026-03-21T00:00:00.000Z',
      scores: {
        ...assessmentResult.scores,
        critical_thinking: 62,
        strategy: 58,
      },
    };

    progress = ensureCurriculumProgress(progress, retake, baseRecommendations, curriculumCourses);

    expect(progress.previous_scores).toEqual(assessmentResult.scores);
    expect(progress.latest_scores).toEqual(retake.scores);
  });
});
