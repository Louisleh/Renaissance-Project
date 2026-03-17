# Codex Build Prompt: Phase 5 — Curriculum System

## CRITICAL CONTEXT — READ FIRST

You are working on an existing **Vite + React + TypeScript** application called Renaissance Skills. The app already has a working skills assessment that produces an `AssessmentResult` with 8 domain scores (0-100), an archetype, and curriculum recommendations. Your job is to build the **Curriculum System** — the actual learning content, course cards, lesson pages, progress tracking, and reassessment loop.

**You MUST NOT:**
- Create a new project or install new frameworks
- Change existing scoring/intelligence logic in `src/lib/scoring.ts` or `src/lib/profile-intelligence.ts`
- Change existing types unless extending them (never remove or rename existing fields)
- Modify existing assessment components (QuickPulse, etc.)
- Change design tokens or global styles
- Add any backend, database, or external API calls — this is frontend-only
- Install UI component libraries — use plain CSS matching the existing design system
- Use `any` type — everything must be properly typed

**You MUST:**
- Follow all existing conventions exactly (file structure, naming, CSS, component patterns)
- Use existing types and functions where they already exist
- Match the dark premium visual style (design tokens provided below)
- Ensure `npm run build`, `npm run lint`, and `npm run test` all pass with zero errors
- Write Vitest unit tests for all new logic functions

---

## EXISTING PROJECT STRUCTURE

```
renaissance-app/src/
├── __tests__/
├── components/
│   ├── About/ Assessment/ Archetypes/ Dashboard/ Hero/ Nav/
│   ├── QuickPulse/QuickPulseOverlay.tsx    ← full-screen overlay pattern reference
│   ├── RadarChart/RadarChart.tsx           ← reusable
│   ├── Results/ResultsPage.tsx
│   └── common/ErrorBoundary.tsx            ← reusable
├── data/
│   ├── assessments.ts
│   └── quick-pulse-module.json
├── hooks/
│   ├── useAnimatedCounter.ts
│   └── useReveal.ts
├── lib/
│   ├── profile-intelligence.ts   ← has CurriculumRecommendation type + buildCurriculum()
│   └── scoring.ts
├── styles/
│   ├── global.css
│   └── tokens.css
├── types/index.ts
├── App.tsx                       ← Routes: "/" and "/results"
└── main.tsx
```

---

## DESIGN TOKENS (use exactly)

```css
:root {
  --bg: #0d0d0d;
  --bg-deep: #090909;
  --panel: rgba(22, 21, 18, 0.88);
  --gold: #d4af37;
  --gold-strong: #b5952f;
  --text: #e6e6e6;
  --muted: #bcb4a3;
  --muted-strong: #8c8577;
  --border: rgba(212, 175, 55, 0.2);
  --shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  --heading-font: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --body-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --container: min(1180px, calc(100vw - 2rem));
  --nav-height: 78px;
}
```

---

## EXISTING TYPES YOU MUST KNOW

```typescript
export type DomainKey =
  | 'leadership' | 'creativity' | 'strategy' | 'tech_proficiency'
  | 'problem_solving' | 'critical_thinking' | 'adaptability' | 'data_analysis';

export type ArchetypeKey = 'polymath' | 'strategist' | 'builder' | 'leader';
export type LevelLabel = 'Emerging' | 'Developing' | 'Functional' | 'Strong' | 'Signature';

// This is the output of the existing assessment system
export interface AssessmentResult {
  assessment_id: string;
  assessment_name: string;
  completed_at: string;
  response_count: number;
  responses: QuestionResponse[];
  scores: DomainScores;           // Record<DomainKey, number>  (0-100)
  levels: DomainLevels;           // Record<DomainKey, LevelLabel>
  top_strengths: DomainKey[];     // Top 3
  growth_domains: DomainKey[];    // Bottom 3
  archetype: ArchetypeResult;
  balance_index: number;
  recommended_modules: string[];  // Module names for growth domains
}

// This already exists in profile-intelligence.ts
export interface CurriculumRecommendation {
  order: number;
  domain: DomainKey;
  domain_label: string;
  module_name: string;
  rationale: string;
  estimated_time: string;
  dependencies: DomainKey[];
  priority: 'high' | 'medium' | 'low';
}

export interface ProfileIntelligence {
  narrative: ProfileNarrative;
  weak_domains: WeakDomainAnalysis[];
  archetype_breakdown: ArchetypeConfidenceBreakdown;
  curriculum: CurriculumRecommendation[];   // ← THIS drives your curriculum
  profile_type: 'specialist' | 'balanced' | 'broad_shallow' | 'strong_balanced';
  balance_interpretation: string;
}
```

The existing `buildCurriculum()` in `src/lib/profile-intelligence.ts` already produces ordered `CurriculumRecommendation[]` with dependency-aware topological sorting. Your curriculum UI consumes this output.

---

## WHAT TO BUILD

### 1. Curriculum Content Data (`src/data/curriculum.ts`)

Create the full curriculum taxonomy. Each of the 8 domains gets a structured course:

```typescript
export interface Lesson {
  id: string;                    // e.g., "leadership_01_01"
  title: string;                 // e.g., "Framing a Clear Direction"
  type: 'read' | 'exercise' | 'scenario' | 'reflection';
  estimated_minutes: number;     // 10-25
  content: LessonContent;
}

export interface LessonContent {
  // Markdown-formatted lesson text — 200-400 words
  body: string;
  // For exercises/scenarios: a specific prompt or task
  prompt?: string;
  // Key takeaway — 1-2 sentences
  takeaway: string;
  // Optional: recommended reading (title + author, no URLs)
  reading?: { title: string; author: string };
}

export interface CourseModule {
  id: string;                    // e.g., "leadership_influence"
  domain: DomainKey;
  title: string;                 // e.g., "Influence Through Clarity"
  description: string;           // 1-2 sentences
  estimated_minutes: number;     // Sum of lesson minutes
  lesson_count: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  prerequisites: DomainKey[];    // Must match domainDependencies from profile-intelligence.ts
  lessons: Lesson[];
}

export interface CurriculumData {
  version: number;
  courses: CourseModule[];
}
```

**Content requirements for each domain:**

| Domain | Course Title | Lessons | Focus |
|--------|-------------|---------|-------|
| leadership | Influence Through Clarity | 4 | Narrative framing, stakeholder alignment, delegation, feedback loops |
| creativity | Cross-Domain Idea Generation | 4 | Divergent thinking, analogical transfer, constraint reframing, creative synthesis |
| strategy | Systems Mapping and Leverage | 3 | Systems thinking, second-order effects, strategic sequencing |
| tech_proficiency | Tool Fluency for Non-Specialists | 5 | Mental models for tech, API/data concepts, automation thinking, AI collaboration, technical communication |
| problem_solving | Constraint Decomposition | 4 | Problem framing, constraint identification, solution space mapping, iterative refinement |
| critical_thinking | Assumption Testing | 3 | Evidence evaluation, logical fallacies, Bayesian updating |
| adaptability | Operating Under Change | 3 | Ambiguity tolerance, plan revision, context switching |
| data_analysis | Evidence Before Intuition | 4 | Quantitative reasoning, data interpretation, experiment design, metrics that matter |

**Lesson content guidelines:**
- Each lesson body should be 200-400 words of actual educational content — not placeholder text
- Use real frameworks, mental models, and practical techniques
- Write in second person ("You will...", "Consider how...")
- Exercises should have concrete, actionable prompts
- Scenarios should describe realistic workplace situations
- Reflections should ask specific self-assessment questions
- Takeaways should be memorable and actionable

**IMPORTANT: The course titles MUST match the module names in `profile-intelligence.ts`:**
```typescript
const moduleDetails: Record<DomainKey, { module: string; ... }> = {
  leadership: { module: 'Influence Through Clarity', ... },
  creativity: { module: 'Cross-Domain Idea Generation', ... },
  strategy: { module: 'Systems Mapping and Leverage', ... },
  tech_proficiency: { module: 'Tool Fluency for Non-Specialists', ... },
  problem_solving: { module: 'Constraint Decomposition', ... },
  critical_thinking: { module: 'Assumption Testing', ... },
  adaptability: { module: 'Operating Under Change', ... },
  data_analysis: { module: 'Evidence Before Intuition', ... },
};
```

### 2. Curriculum Progress System (`src/lib/curriculum-progress.ts`)

```typescript
export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;       // User's personal notes/reflections
}

export interface CourseProgress {
  course_id: string;
  domain: DomainKey;
  started_at: string;
  lessons: Record<string, LessonProgress>;  // keyed by lesson_id
  completed: boolean;
  completed_at: string | null;
}

export interface CurriculumProgress {
  user_started_at: string;
  courses: Record<string, CourseProgress>;   // keyed by course_id
  reassessment_available: boolean;           // true when ≥1 course fully completed
}

// localStorage key
const CURRICULUM_PROGRESS_KEY = 'renaissance_curriculum_progress';

// Initialize progress for recommended courses
function initProgress(recommendations: CurriculumRecommendation[], courses: CourseModule[]): CurriculumProgress;

// Load from localStorage
function loadProgress(): CurriculumProgress | null;

// Save to localStorage
function saveProgress(progress: CurriculumProgress): void;

// Mark a lesson complete
function completeLesson(progress: CurriculumProgress, courseId: string, lessonId: string): CurriculumProgress;

// Save user notes for a lesson
function saveLessonNotes(progress: CurriculumProgress, courseId: string, lessonId: string, notes: string): CurriculumProgress;

// Get overall completion stats
function getCompletionStats(progress: CurriculumProgress): {
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  coursesStarted: number;
  coursesCompleted: number;
};

// Check if reassessment should be suggested
function shouldSuggestReassessment(progress: CurriculumProgress): boolean;
```

### 3. Curriculum Page Component (`src/components/Curriculum/CurriculumPage.tsx` + `.css`)

A new route at `/curriculum` that shows the personalized learning path.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Nav                                           │
├────────────────────────────────────────────────┤
│                                                │
│  Your Development Path                         │
│  Based on your [archetype] profile             │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ Overall Progress: 3/30 lessons • 10%     │  │
│  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ Course 1    │  │ Course 2    │  ...          │
│  │ HIGH PRIO   │  │ MED PRIO    │              │
│  │ Domain name │  │ Domain name │              │
│  │ 0/4 lessons │  │ 0/3 lessons │              │
│  │ [Start →]   │  │ [Locked 🔒] │              │
│  └─────────────┘  └─────────────┘              │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ 🔄 Reassessment Available                │  │
│  │ Retake Quick Pulse to measure growth     │  │
│  └──────────────────────────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│  Footer                                        │
└────────────────────────────────────────────────┘
```

**Behavior:**
- If no assessment result exists in localStorage, show a CTA to take the Quick Pulse first
- Course cards show in the order from `CurriculumRecommendation` (dependency-aware)
- A course with unmet prerequisites shows as "locked" with the prerequisite name
- A course unlocks when its prerequisite course is completed OR the user's score in the prerequisite domain is ≥ 60
- Each course card shows: title, domain, priority badge, lesson count, completion progress bar
- Clicking an unlocked course navigates to the lesson view

### 4. Lesson View Component (`src/components/Curriculum/LessonView.tsx` + `.css`)

A new route at `/curriculum/:courseId/:lessonId`.

**Layout:**
```
┌────────────────────────────────────────────────┐
│  Nav                                           │
├────────────────────────────────────────────────┤
│  ← Back to [Course Title]                      │
│                                                │
│  Lesson 2 of 4 • Exercise                      │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │  [Lesson Title]                          │  │
│  │                                          │  │
│  │  [Rendered markdown body content]        │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ Exercise Prompt:                   │  │  │
│  │  │ [prompt text in gold-bordered box] │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ Key Takeaway                       │  │  │
│  │  │ [takeaway text]                    │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ Your Notes                         │  │  │
│  │  │ [textarea — saved to localStorage] │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │                                          │  │
│  │  📖 Recommended: [Book Title] by Author  │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  [← Previous]              [Mark Complete →]   │
│                             [Next Lesson →]    │
│                                                │
├────────────────────────────────────────────────┤
│  Footer                                        │
└────────────────────────────────────────────────┘
```

**Behavior:**
- Renders lesson body as formatted text (not raw markdown — just use paragraphs, bold, lists)
- Exercise prompt shown in a highlighted box with gold border
- Takeaway shown in a subtle panel at bottom
- "Your Notes" textarea persists to localStorage via curriculum progress system
- "Mark Complete" button marks the lesson done, shows a brief success animation, then enables "Next Lesson"
- If lesson is already completed, show a checkmark and "Completed" state
- "Previous" / "Next" navigate between lessons in the course
- After completing the last lesson in a course, show a "Course Complete" celebration card with option to return to curriculum overview

### 5. Course Overview Component (`src/components/Curriculum/CourseOverview.tsx` + `.css`)

A new route at `/curriculum/:courseId`.

Shows the course intro, lesson list with completion status, and a "Start" or "Continue" button.

```
┌──────────────────────────────────────────┐
│  [Course Title]                          │
│  [Domain] • [difficulty] • [time]        │
│  [description]                           │
│                                          │
│  Progress: 2/4 lessons                   │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░  │
│                                          │
│  1. ✓ Lesson Title      (read • 15 min) │
│  2. ✓ Lesson Title      (exercise • 20) │
│  3. → Lesson Title      (scenario • 15) │  ← current
│  4.   Lesson Title      (reflect • 10)  │
│                                          │
│  [Continue →]                            │
└──────────────────────────────────────────┘
```

### 6. Reassessment Loop

When `shouldSuggestReassessment()` returns true (at least 1 course fully completed):
- Show a banner on the curriculum page: "You've completed [Course Name]. Retake Quick Pulse to measure your growth."
- The banner links to the home page assessment trigger
- After retake, the new scores update the curriculum recommendations
- Show a "before vs after" comparison in the curriculum page header

### 7. Routing Changes (`src/App.tsx`)

Add three new routes:
```typescript
<Route path="/curriculum" element={<CurriculumRoute />} />
<Route path="/curriculum/:courseId" element={<CourseOverviewRoute />} />
<Route path="/curriculum/:courseId/:lessonId" element={<LessonRoute />} />
```

Each route should include the `<Nav>` and footer, following the same pattern as `ResultsRoute`.

Also add a "View Curriculum" button in:
- The Quick Pulse results screen (alongside "View Development Path")
- The Dashboard section (in the "Recommended Reading" future card, replace placeholder text)

---

## TYPES TO ADD (`src/types/index.ts`)

Append to the existing file:

```typescript
// ── Curriculum Types ──

export interface LessonContent {
  body: string;
  prompt?: string;
  takeaway: string;
  reading?: { title: string; author: string };
}

export interface Lesson {
  id: string;
  title: string;
  type: 'read' | 'exercise' | 'scenario' | 'reflection';
  estimated_minutes: number;
  content: LessonContent;
}

export interface CourseModule {
  id: string;
  domain: DomainKey;
  title: string;
  description: string;
  estimated_minutes: number;
  lesson_count: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  prerequisites: DomainKey[];
  lessons: Lesson[];
}

export interface CurriculumData {
  version: number;
  courses: CourseModule[];
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  notes: string;
}

export interface CourseProgress {
  course_id: string;
  domain: DomainKey;
  started_at: string;
  lessons: Record<string, LessonProgress>;
  completed: boolean;
  completed_at: string | null;
}

export interface CurriculumProgress {
  user_started_at: string;
  courses: Record<string, CourseProgress>;
  reassessment_available: boolean;
}
```

---

## CSS CONVENTIONS

- Prefix all new classes with `cur-` (curriculum) for pages, `lesson-` for lesson view
- Use design tokens — never hardcode colors
- Panel pattern: `background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 2rem;`
- Progress bars: track `background: rgba(212,175,55,0.1)`, fill `background: var(--gold)`
- Priority badges: high = gold background, medium = border only, low = muted
- Locked state: `opacity: 0.5; pointer-events: none;`
- Include `@media (prefers-reduced-motion: reduce)` for all animations
- Mobile breakpoint: `@media (max-width: 640px)` — stack cards vertically

---

## TESTS TO WRITE (`src/__tests__/curriculum-progress.test.ts`)

1. `initProgress` creates entries for all recommended courses
2. `completeLesson` marks lesson done and updates timestamp
3. `completeLesson` on last lesson marks course as completed
4. `saveLessonNotes` persists notes correctly
5. `getCompletionStats` returns accurate counts and percentages
6. `shouldSuggestReassessment` returns false with no completed courses
7. `shouldSuggestReassessment` returns true with 1+ completed course
8. `loadProgress` / `saveProgress` round-trip through localStorage correctly
9. Course locking: course with prerequisites shows locked when prereq incomplete
10. Course locking: course unlocks when prereq course completed OR domain score ≥ 60

---

## VERIFICATION CHECKLIST

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test` passes (existing + new tests)
- [ ] `/curriculum` route shows personalized course list from assessment result
- [ ] `/curriculum` shows "take assessment first" CTA when no result exists
- [ ] Course cards show correct priority, progress, and lock state
- [ ] `/curriculum/:courseId` shows course overview with lesson list
- [ ] `/curriculum/:courseId/:lessonId` renders lesson content
- [ ] Lesson notes persist across page reloads
- [ ] "Mark Complete" updates progress and enables next lesson
- [ ] Course completion triggers reassessment suggestion
- [ ] "View Curriculum" button added to Quick Pulse results and Dashboard
- [ ] Dependency locking works (strategy locked until critical_thinking complete/scored ≥60)
- [ ] Mobile layout works at 375px width
- [ ] `prefers-reduced-motion` disables all animations
- [ ] No `any` types
- [ ] All curriculum content is original, substantive text (not placeholder)
