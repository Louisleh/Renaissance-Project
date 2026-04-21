import { trackEvent, type AssessmentType } from './data-sync';
import type { ArchetypeKey, DomainKey, LevelLabel } from '../types';
import type { KnowledgeDomain, Rating } from '../types/cards';

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

export async function trackStudySessionStarted(
  dueCount: number,
  plannedCount: number,
  source: string,
  userId?: string | null,
): Promise<void> {
  await trackEvent('study_session_started', { due_count: dueCount, planned_count: plannedCount, source }, userId);
}

export async function trackStudySessionCompleted(
  cardsReviewed: number,
  durationMs: number,
  retentionPct: number,
  domainsTouched: KnowledgeDomain[],
  userId?: string | null,
): Promise<void> {
  await trackEvent(
    'study_session_completed',
    {
      cards_reviewed: cardsReviewed,
      duration_ms: durationMs,
      retention_pct: retentionPct,
      domains_touched: domainsTouched,
    },
    userId,
  );
}

export async function trackCardReviewed(
  cardId: string,
  domain: KnowledgeDomain,
  rating: Rating,
  prevStability: number | null,
  nextStability: number | null,
  durationMs: number,
  userId?: string | null,
): Promise<void> {
  await trackEvent(
    'card_reviewed',
    {
      card_id: cardId,
      domain,
      rating,
      prev_stability: prevStability,
      next_stability: nextStability,
      duration_ms: durationMs,
    },
    userId,
  );
}

export async function trackMasteryLevelPromotion(
  domain: KnowledgeDomain,
  fromLevel: LevelLabel,
  toLevel: LevelLabel,
  userId?: string | null,
): Promise<void> {
  await trackEvent('mastery_level_promotion', { domain, from_level: fromLevel, to_level: toLevel }, userId);
}

export async function trackSynthesisIndexChanged(
  from: number,
  to: number,
  userId?: string | null,
): Promise<void> {
  await trackEvent('synthesis_index_changed', { from, to }, userId);
}

export async function trackStreakExtended(streakDays: number, userId?: string | null): Promise<void> {
  await trackEvent('streak_extended', { streak_days: streakDays }, userId);
}

export async function trackStreakMilestone(streakDays: number, userId?: string | null): Promise<void> {
  await trackEvent('streak_milestone', { streak_days: streakDays }, userId);
}

export async function trackAchievementUnlocked(
  achievementId: string,
  context: Record<string, unknown> | null,
  userId?: string | null,
): Promise<void> {
  await trackEvent('achievement_unlocked', { achievement_id: achievementId, context }, userId);
}

export async function trackJourneyViewed(
  synthesisIndex: number,
  domainsAtStrongOrAbove: number,
  userId?: string | null,
): Promise<void> {
  await trackEvent(
    'journey_viewed',
    { synthesis_index: synthesisIndex, domains_at_strong_or_above: domainsAtStrongOrAbove },
    userId,
  );
}

export async function trackCommonplaceSubmitted(
  promptId: string,
  charCount: number,
  domainHint: KnowledgeDomain | null,
  userId?: string | null,
): Promise<void> {
  await trackEvent(
    'commonplace_submitted',
    { prompt_id: promptId, char_count: charCount, domain_hint: domainHint },
    userId,
  );
}
