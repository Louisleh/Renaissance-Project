import { trackEvent, type AssessmentType } from './data-sync';
import type { ArchetypeKey, DomainKey } from '../types';

export async function trackAssessmentStarted(
  type: AssessmentType,
  userId?: string | null
): Promise<void> {
  await trackEvent('assessment_started', { type }, userId);
}

export async function trackAssessmentCompleted(
  type: AssessmentType,
  archetype: ArchetypeKey,
  balanceIndex: number,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'assessment_completed',
    {
      type,
      archetype,
      balance_index: balanceIndex,
    },
    userId
  );
}

export async function trackAssessmentQuestionAnswered(
  type: AssessmentType,
  questionIndex: number,
  timeSpentMs: number,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'assessment_question_answered',
    {
      type,
      question_index: questionIndex,
      time_spent_ms: timeSpentMs,
    },
    userId
  );
}

export async function trackCurriculumCourseStarted(
  courseId: string,
  domain: DomainKey,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'curriculum_course_started',
    {
      course_id: courseId,
      domain,
    },
    userId
  );
}

export async function trackCurriculumLessonCompleted(
  courseId: string,
  lessonId: string,
  domain: DomainKey,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'curriculum_lesson_completed',
    {
      course_id: courseId,
      lesson_id: lessonId,
      domain,
    },
    userId
  );
}

export async function trackCurriculumCourseCompleted(
  courseId: string,
  domain: DomainKey,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'curriculum_course_completed',
    {
      course_id: courseId,
      domain,
    },
    userId
  );
}

export async function trackReassessmentTriggered(
  previousAssessmentId: string,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'reassessment_triggered',
    {
      previous_assessment_id: previousAssessmentId,
    },
    userId
  );
}

export async function trackPageView(path: string, userId?: string | null): Promise<void> {
  await trackEvent('page_view', { path }, userId);
}

export async function trackCtaClick(
  ctaId: string,
  location: string,
  userId?: string | null
): Promise<void> {
  await trackEvent(
    'cta_click',
    {
      cta_id: ctaId,
      location,
    },
    userId
  );
}

export async function trackSignIn(
  method: 'email' | 'google',
  userId?: string | null
): Promise<void> {
  await trackEvent('sign_in', { method }, userId);
}

export async function trackSignOut(userId?: string | null): Promise<void> {
  await trackEvent('sign_out', {}, userId);
}
