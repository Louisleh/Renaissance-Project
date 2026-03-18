import type {
  AssessmentResult,
  CourseModule,
  CourseProgress,
  CurriculumProgress,
  CurriculumRecommendation,
  DomainKey,
  DomainScores,
  LessonProgress,
} from '../types';

export const CURRICULUM_PROGRESS_KEY = 'renaissance_curriculum_progress';

export interface CompletionStats {
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  coursesStarted: number;
  coursesCompleted: number;
}

export interface CourseLockState {
  locked: boolean;
  unmetPrerequisites: DomainKey[];
}

function createLessonProgressMap(course: CourseModule): Record<string, LessonProgress> {
  return course.lessons.reduce<Record<string, LessonProgress>>((acc, lesson) => {
    acc[lesson.id] = {
      lesson_id: lesson.id,
      completed: false,
      completed_at: null,
      notes: '',
    };
    return acc;
  }, {});
}

function createCourseProgress(course: CourseModule, startedAt: string): CourseProgress {
  return {
    course_id: course.id,
    domain: course.domain,
    started_at: startedAt,
    lessons: createLessonProgressMap(course),
    completed: false,
    completed_at: null,
  };
}

export function initProgress(
  recommendations: CurriculumRecommendation[],
  courses: CourseModule[]
): CurriculumProgress {
  const startedAt = new Date().toISOString();
  const courseMap = recommendations.reduce<Record<string, CourseProgress>>((acc, recommendation) => {
    const course = courses.find((candidate) => candidate.domain === recommendation.domain);
    if (course && !acc[course.id]) {
      acc[course.id] = createCourseProgress(course, startedAt);
    }
    return acc;
  }, {});

  return {
    user_started_at: startedAt,
    courses: courseMap,
    reassessment_available: false,
  };
}

function isLessonProgressRecord(value: unknown): value is Record<string, LessonProgress> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every((lesson) => {
    if (!lesson || typeof lesson !== 'object') {
      return false;
    }

    const candidate = lesson as LessonProgress;
    return (
      typeof candidate.lesson_id === 'string' &&
      typeof candidate.completed === 'boolean' &&
      (candidate.completed_at === null || typeof candidate.completed_at === 'string') &&
      typeof candidate.notes === 'string'
    );
  });
}

function isCourseProgressRecord(value: unknown): value is Record<string, CourseProgress> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value).every((course) => {
    if (!course || typeof course !== 'object') {
      return false;
    }

    const candidate = course as CourseProgress;
    return (
      typeof candidate.course_id === 'string' &&
      typeof candidate.domain === 'string' &&
      typeof candidate.started_at === 'string' &&
      isLessonProgressRecord(candidate.lessons) &&
      typeof candidate.completed === 'boolean' &&
      (candidate.completed_at === null || typeof candidate.completed_at === 'string')
    );
  });
}

function isDomainScores(value: unknown): value is DomainScores {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const requiredKeys: DomainKey[] = [
    'leadership',
    'creativity',
    'strategy',
    'tech_proficiency',
    'problem_solving',
    'critical_thinking',
    'adaptability',
    'data_analysis',
  ];

  return requiredKeys.every((key) => typeof (value as Record<string, unknown>)[key] === 'number');
}

function isCurriculumProgress(value: unknown): value is CurriculumProgress {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as CurriculumProgress;

  return (
    typeof candidate.user_started_at === 'string' &&
    isCourseProgressRecord(candidate.courses) &&
    typeof candidate.reassessment_available === 'boolean' &&
    (candidate.baseline_scores === undefined || isDomainScores(candidate.baseline_scores)) &&
    (candidate.previous_scores === undefined || candidate.previous_scores === null || isDomainScores(candidate.previous_scores)) &&
    (candidate.latest_scores === undefined || isDomainScores(candidate.latest_scores)) &&
    (candidate.latest_assessment_completed_at === undefined || typeof candidate.latest_assessment_completed_at === 'string')
  );
}

export function loadProgress(): CurriculumProgress | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(CURRICULUM_PROGRESS_KEY);
    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);
    return isCurriculumProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: CurriculumProgress): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CURRICULUM_PROGRESS_KEY, JSON.stringify(progress));
}

export function completeLesson(
  progress: CurriculumProgress,
  courseId: string,
  lessonId: string
): CurriculumProgress {
  const course = progress.courses[courseId];
  if (!course || !course.lessons[lessonId]) {
    return progress;
  }

  const completedAt = new Date().toISOString();
  const nextLessons = {
    ...course.lessons,
    [lessonId]: {
      ...course.lessons[lessonId],
      completed: true,
      completed_at: completedAt,
    },
  };

  const allCompleted = Object.values(nextLessons).every((lesson) => lesson.completed);
  const nextCourse: CourseProgress = {
    ...course,
    lessons: nextLessons,
    completed: allCompleted,
    completed_at: allCompleted ? completedAt : course.completed_at,
  };

  const nextProgress: CurriculumProgress = {
    ...progress,
    courses: {
      ...progress.courses,
      [courseId]: nextCourse,
    },
  };

  return {
    ...nextProgress,
    reassessment_available: shouldSuggestReassessment(nextProgress),
  };
}

export function saveLessonNotes(
  progress: CurriculumProgress,
  courseId: string,
  lessonId: string,
  notes: string
): CurriculumProgress {
  const course = progress.courses[courseId];
  if (!course || !course.lessons[lessonId]) {
    return progress;
  }

  return {
    ...progress,
    courses: {
      ...progress.courses,
      [courseId]: {
        ...course,
        lessons: {
          ...course.lessons,
          [lessonId]: {
            ...course.lessons[lessonId],
            notes,
          },
        },
      },
    },
  };
}

export function getCompletionStats(progress: CurriculumProgress): CompletionStats {
  const courseEntries = Object.values(progress.courses);
  const totalLessons = courseEntries.reduce((total, course) => total + Object.keys(course.lessons).length, 0);
  const completedLessons = courseEntries.reduce((total, course) => {
    return total + Object.values(course.lessons).filter((lesson) => lesson.completed).length;
  }, 0);

  return {
    totalLessons,
    completedLessons,
    percentComplete: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
    coursesStarted: courseEntries.length,
    coursesCompleted: courseEntries.filter((course) => course.completed).length,
  };
}

export function shouldSuggestReassessment(progress: CurriculumProgress): boolean {
  return Object.values(progress.courses).some((course) => course.completed);
}

export function syncProgressWithRecommendations(
  progress: CurriculumProgress,
  recommendations: CurriculumRecommendation[],
  courses: CourseModule[]
): CurriculumProgress {
  const nextCourses = { ...progress.courses };

  for (const recommendation of recommendations) {
    const course = courses.find((candidate) => candidate.domain === recommendation.domain);
    if (course && !nextCourses[course.id]) {
      nextCourses[course.id] = createCourseProgress(course, progress.user_started_at);
    }
  }

  return {
    ...progress,
    courses: nextCourses,
    reassessment_available: shouldSuggestReassessment({ ...progress, courses: nextCourses }),
  };
}

export function syncAssessmentSnapshot(
  progress: CurriculumProgress,
  result: Pick<AssessmentResult, 'scores' | 'completed_at'>
): CurriculumProgress {
  if (!progress.baseline_scores) {
    return {
      ...progress,
      baseline_scores: result.scores,
      latest_scores: result.scores,
      previous_scores: null,
      latest_assessment_completed_at: result.completed_at,
    };
  }

  if (progress.latest_assessment_completed_at === result.completed_at) {
    return {
      ...progress,
      latest_scores: result.scores,
    };
  }

  return {
    ...progress,
    previous_scores: progress.latest_scores ?? progress.baseline_scores,
    latest_scores: result.scores,
    latest_assessment_completed_at: result.completed_at,
  };
}

export function ensureCurriculumProgress(
  progress: CurriculumProgress | null,
  result: AssessmentResult,
  recommendations: CurriculumRecommendation[],
  courses: CourseModule[]
): CurriculumProgress {
  const baseProgress = progress ?? initProgress(recommendations, courses);
  const syncedRecommendations = syncProgressWithRecommendations(baseProgress, recommendations, courses);
  const syncedSnapshot = syncAssessmentSnapshot(syncedRecommendations, result);

  return {
    ...syncedSnapshot,
    reassessment_available: shouldSuggestReassessment(syncedSnapshot),
  };
}

export function getCourseLockState(
  course: CourseModule,
  progress: CurriculumProgress | null,
  scores: DomainScores,
  courses: CourseModule[]
): CourseLockState {
  const unmetPrerequisites = course.prerequisites.filter((prerequisite) => {
    if (scores[prerequisite] >= 60) {
      return false;
    }

    const prerequisiteCourse = courses.find((candidate) => candidate.domain === prerequisite);
    if (!prerequisiteCourse || !progress) {
      return true;
    }

    return !progress.courses[prerequisiteCourse.id]?.completed;
  });

  return {
    locked: unmetPrerequisites.length > 0,
    unmetPrerequisites,
  };
}
