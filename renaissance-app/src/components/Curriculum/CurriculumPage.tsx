import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import moduleData from '../../data/quick-pulse-module.json';
import { curriculumCourses } from '../../data/curriculum';
import { trackCtaClick, trackCurriculumCourseStarted } from '../../lib/analytics';
import { domainLabel } from '../../lib/scoring';
import { getCompletionStats, getCourseLockState } from '../../lib/curriculum-progress';
import { useCurriculumState } from './curriculumState';
import type { CourseModule, CurriculumRecommendation, DomainKey, QuickPulseModule } from '../../types';
import './CurriculumPage.css';

const qpData = moduleData as unknown as QuickPulseModule;

interface RecommendedCourse {
  course: CourseModule;
  recommendation: CurriculumRecommendation;
}

function buildRecommendedCourses(recommendations: CurriculumRecommendation[]): RecommendedCourse[] {
  return recommendations.flatMap((recommendation) => {
    const course = curriculumCourses.find((candidate) => candidate.domain === recommendation.domain);
    return course ? [{ course, recommendation }] : [];
  });
}

function getCompletedLessonCount(course: CourseModule, completedLessons: Record<string, { completed: boolean }>): number {
  return course.lessons.filter((lesson) => completedLessons[lesson.id]?.completed).length;
}

function formatPrerequisites(domains: DomainKey[]): string {
  return domains.map((domain) => domainLabel(domain, qpData.domains)).join(', ');
}

export function CurriculumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { curriculumState } = useCurriculumState();

  if (!curriculumState) {
    return (
      <main className="cur-page" id="main-content">
        <div className="container">
          <section className="cur-empty">
            <div className="eyebrow">Curriculum</div>
            <h2>Take the Quick Pulse before you open your learning path.</h2>
            <p className="lede">
              Your curriculum is personalized from your assessment result. Start with the Quick Pulse so the platform can
              sequence the right courses, dependencies, and reassessment loop.
            </p>
            <button
              className="hero-button"
              onClick={() => {
                void trackCtaClick('take_quick_pulse', 'curriculum_empty', user?.id ?? null);
                navigate('/', { state: { openQuickPulse: true } });
              }}
            >
              Take Quick Pulse
            </button>
          </section>
        </div>
      </main>
    );
  }

  const { result, intelligence, progress } = curriculumState;
  const stats = getCompletionStats(progress);
  const recommendedCourses = buildRecommendedCourses(intelligence.curriculum);
  const completedCourseNames = Object.values(progress.courses)
    .filter((courseProgress) => courseProgress.completed)
    .map((courseProgress) => curriculumCourses.find((course) => course.id === courseProgress.course_id)?.title)
    .filter((title): title is string => Boolean(title));
  const showComparison = Boolean(progress.previous_scores && progress.latest_scores);

  return (
    <main className="cur-page" id="main-content">
      <section className="cur-hero">
        <div className="container">
          <div className="cur-hero-copy">
            <div className="eyebrow">Curriculum System</div>
            <h1>Your Development Path</h1>
            <p className="cur-hero-subtitle">
              Based on your <strong>{result.archetype.label}</strong> profile, this path prioritizes weak domains first
              and respects the dependency structure already inferred from your assessment.
            </p>
          </div>

          <section className="cur-summary-card" aria-label="Overall curriculum progress">
            <div className="cur-summary-head">
              <div>
                <h2>Overall Progress</h2>
                <p>
                  {stats.completedLessons}/{stats.totalLessons} lessons complete • {stats.percentComplete}% complete
                </p>
              </div>
              <div className="cur-summary-meta">
                <span>{stats.coursesCompleted} completed</span>
                <span>{stats.coursesStarted} active courses</span>
              </div>
            </div>
            <div className="cur-progress-track" aria-hidden="true">
              <div className="cur-progress-fill" style={{ width: `${stats.percentComplete}%` }} />
            </div>
          </section>

          {showComparison && progress.previous_scores && progress.latest_scores && (
            <section className="cur-comparison-card" aria-label="Reassessment comparison">
              <div className="cur-card-kicker">Before vs After</div>
              <h3>Growth since your last reassessment</h3>
              <div className="cur-comparison-grid">
                {qpData.domains.map((domain) => {
                  const previous = progress.previous_scores?.[domain.key] ?? 0;
                  const latest = progress.latest_scores?.[domain.key] ?? 0;
                  const delta = latest - previous;

                  return (
                    <div key={domain.key} className="cur-comparison-item">
                      <span className="cur-comparison-label">{domain.label}</span>
                      <strong>{previous} → {latest}</strong>
                      <span className={`cur-comparison-delta ${delta >= 0 ? 'is-positive' : 'is-negative'}`}>
                        {delta >= 0 ? '+' : ''}
                        {delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {progress.reassessment_available && completedCourseNames.length > 0 && (
            <section className="cur-banner" aria-label="Reassessment available">
              <div>
                <div className="cur-card-kicker">Reassessment Available</div>
                <h3>Retake Quick Pulse to measure growth</h3>
                <p>
                  You&apos;ve completed {completedCourseNames.join(', ')}. Run the Quick Pulse again to compare your new
                  profile against the previous snapshot and refresh the recommended order.
                </p>
              </div>
              <button
                className="hero-button"
                onClick={() => {
                  void trackCtaClick('retake_quick_pulse', 'curriculum_banner', user?.id ?? null);
                  navigate('/', { state: { openQuickPulse: true } });
                }}
              >
                Retake Quick Pulse
              </button>
            </section>
          )}
        </div>
      </section>

      <section className="cur-courses-section">
        <div className="container">
          <div className="cur-courses-head">
            <div>
              <div className="cur-card-kicker">Personalized Course Order</div>
              <h2>Recommended sequence</h2>
            </div>
            <p className="lede">
              Courses unlock when prerequisite domains are already functional in your score profile or when their
              prerequisite course is completed.
            </p>
          </div>

          <div className="cur-cards">
            {recommendedCourses.map(({ course, recommendation }) => {
              const courseProgress = progress.courses[course.id];
              const completedLessons = courseProgress ? getCompletedLessonCount(course, courseProgress.lessons) : 0;
              const percentComplete = Math.round((completedLessons / course.lesson_count) * 100);
              const lockState = getCourseLockState(course, progress, result.scores, curriculumCourses);
              const actionLabel = courseProgress?.completed
                ? 'Review Course'
                : completedLessons > 0
                  ? 'Continue'
                  : 'Start';

              return (
                <article
                  key={course.id}
                  className={`cur-course-card${lockState.locked ? ' is-locked' : ''}`}
                >
                  <div className="cur-course-top">
                    <div className="cur-course-order">{recommendation.order}</div>
                    <span className={`cur-priority-badge cur-priority-${recommendation.priority}`}>
                      {recommendation.priority} priority
                    </span>
                  </div>

                  <div className="cur-card-kicker">{recommendation.domain_label}</div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>

                  <div className="cur-course-meta">
                    <span>{course.lesson_count} lessons</span>
                    <span>{course.estimated_minutes} minutes</span>
                    <span>{course.difficulty}</span>
                  </div>

                  <div className="cur-progress-meta">
                    <span>{completedLessons}/{course.lesson_count} lessons complete</span>
                    <span>{percentComplete}%</span>
                  </div>
                  <div className="cur-progress-track" aria-hidden="true">
                    <div className="cur-progress-fill" style={{ width: `${percentComplete}%` }} />
                  </div>

                  <div className="cur-course-copy">
                    <p>{recommendation.rationale}</p>
                    {lockState.locked ? (
                      <p className="cur-lock-copy">
                        Locked until {formatPrerequisites(lockState.unmetPrerequisites)} reaches a score of 60 or the
                        prerequisite course is completed.
                      </p>
                    ) : course.prerequisites.length > 0 ? (
                      <p className="cur-prereq-copy">
                        Depends on {formatPrerequisites(course.prerequisites)}.
                      </p>
                    ) : (
                      <p className="cur-prereq-copy">No prerequisites. You can begin immediately.</p>
                    )}
                  </div>

                  <button
                    className="ghost-button cur-course-button"
                    onClick={() => {
                      if (completedLessons === 0) {
                        void trackCurriculumCourseStarted(course.id, course.domain, user?.id ?? null);
                      }

                      void trackCtaClick('open_course', 'curriculum_page', user?.id ?? null);
                      navigate(`/curriculum/${course.id}`);
                    }}
                    disabled={lockState.locked}
                  >
                    {lockState.locked ? `Locked • ${formatPrerequisites(lockState.unmetPrerequisites)}` : `${actionLabel} →`}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
