import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import moduleData from '../../data/quick-pulse-module.json';
import { getCourseById, curriculumCourses } from '../../data/curriculum';
import { trackCtaClick, trackCurriculumCourseStarted } from '../../lib/analytics';
import { domainLabel } from '../../lib/scoring';
import { getCourseLockState } from '../../lib/curriculum-progress';
import { useCurriculumState } from './curriculumState';
import type { CourseModule, QuickPulseModule } from '../../types';
import './CurriculumPage.css';
import './CourseOverview.css';

const qpData = moduleData as unknown as QuickPulseModule;

function getCompletedLessonCount(course: CourseModule, lessons: Record<string, { completed: boolean }>): number {
  return course.lessons.filter((lesson) => lessons[lesson.id]?.completed).length;
}

function getNextLessonId(course: CourseModule, lessons: Record<string, { completed: boolean }>): string {
  return course.lessons.find((lesson) => !lessons[lesson.id]?.completed)?.id ?? course.lessons[0].id;
}

export function CourseOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courseId } = useParams();
  const { curriculumState } = useCurriculumState();

  if (!curriculumState) {
    return (
      <main className="cur-overview-page" id="main-content">
        <div className="container">
          <section className="cur-empty">
            <div className="eyebrow">Curriculum</div>
            <h2>Take the Quick Pulse to unlock course content.</h2>
            <p className="lede">Your course overview is generated from the assessment result and its dependency-aware recommendations.</p>
            <button className="hero-button" onClick={() => {
              void trackCtaClick('take_quick_pulse', 'course_overview_empty', user?.id ?? null);
              navigate('/', { state: { openQuickPulse: true } });
            }}>
              Take Quick Pulse
            </button>
          </section>
        </div>
      </main>
    );
  }

  const { result, progress } = curriculumState;
  const course = courseId ? getCourseById(courseId) : undefined;

  if (!course || !progress.courses[course.id]) {
    return (
      <main className="cur-overview-page" id="main-content">
        <div className="container">
          <section className="cur-overview-card">
            <div className="cur-card-kicker">Course Not Found</div>
            <h2>This course is not in your current recommended path.</h2>
            <p>Return to the curriculum overview to work from the current recommendation order.</p>
            <button className="ghost-button" onClick={() => navigate('/curriculum')}>
              Back to Curriculum
            </button>
          </section>
        </div>
      </main>
    );
  }

  const courseProgress = progress.courses[course.id];
  const completedLessons = getCompletedLessonCount(course, courseProgress.lessons);
  const percentComplete = Math.round((completedLessons / course.lesson_count) * 100);
  const nextLessonId = getNextLessonId(course, courseProgress.lessons);
  const lockState = getCourseLockState(course, progress, result.scores, curriculumCourses);

  if (lockState.locked) {
    return (
      <main className="cur-overview-page" id="main-content">
        <div className="container">
          <section className="cur-overview-card">
            <div className="cur-card-kicker">Course Locked</div>
            <h2>{course.title}</h2>
            <p>
              Complete or strengthen {lockState.unmetPrerequisites.map((domain) => domainLabel(domain, qpData.domains)).join(', ')}
              {' '}before opening this course.
            </p>
            <div className="cur-overview-actions">
              <button className="ghost-button" onClick={() => navigate('/curriculum')}>
                Back to Curriculum
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="cur-overview-page" id="main-content">
      <div className="container">
        <section className="cur-overview-card">
          <button className="cur-overview-back" onClick={() => navigate('/curriculum')}>
            ← Back to Curriculum
          </button>

          <div className="cur-card-kicker">{domainLabel(course.domain, qpData.domains)}</div>
          <h1>{course.title}</h1>
          <div className="cur-overview-meta">
            <span>{course.difficulty}</span>
            <span>{course.estimated_minutes} minutes</span>
            <span>{course.lesson_count} lessons</span>
          </div>
          <p className="cur-overview-copy">{course.description}</p>

          <div className="cur-overview-progress">
            <div className="cur-progress-meta">
              <span>Progress: {completedLessons}/{course.lesson_count} lessons</span>
              <span>{percentComplete}%</span>
            </div>
            <div className="cur-progress-track" aria-hidden="true">
              <div className="cur-progress-fill" style={{ width: `${percentComplete}%` }} />
            </div>
          </div>

          <div className="cur-lesson-list">
            {course.lessons.map((lesson, index) => {
              const lessonProgress = courseProgress.lessons[lesson.id];
              const isCurrent = lesson.id === nextLessonId && !courseProgress.completed;
              const isCompleted = lessonProgress?.completed ?? false;

              return (
                <button
                  key={lesson.id}
                  className={`cur-lesson-item${isCompleted ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}`}
                  onClick={() => navigate(`/curriculum/${course.id}/${lesson.id}`)}
                >
                  <span className={`cur-lesson-status${isCompleted ? ' is-complete' : ''}${isCurrent ? ' is-current' : ''}`}>
                    {isCompleted ? '✓' : isCurrent ? '→' : index + 1}
                  </span>
                  <span className="cur-lesson-copy">
                    <strong>{lesson.title}</strong>
                    <span>
                      {lesson.type} • {lesson.estimated_minutes} min
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="cur-overview-actions">
            <button
              className="hero-button"
              onClick={() => {
                if (completedLessons === 0) {
                  void trackCurriculumCourseStarted(course.id, course.domain, user?.id ?? null);
                }

                void trackCtaClick('continue_course', 'course_overview', user?.id ?? null);
                navigate(`/curriculum/${course.id}/${nextLessonId}`);
              }}
            >
              {courseProgress.completed ? 'Review Course →' : completedLessons > 0 ? 'Continue →' : 'Start →'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
