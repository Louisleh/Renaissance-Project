# Codex Build Prompt: Phase 4 — Deep Dive Assessment

## CRITICAL CONTEXT — READ FIRST

You are working on an existing **Vite + React + TypeScript** application called Renaissance Skills. The app is a skills assessment platform with 8 domains and 4 archetypes. A Quick Pulse assessment (10 questions) already works end-to-end. Your job is to build the **Deep Dive Assessment** — a longer, scenario-based assessment with semi-adaptive branching.

**You MUST NOT:**
- Create a new project or install new frameworks
- Change existing scoring logic in `src/lib/scoring.ts`
- Change existing types unless you are extending them with new fields (never remove or rename existing fields)
- Modify the Quick Pulse flow or its components
- Change the design token system or global styles
- Add any backend, database, or API calls — this is a frontend-only build
- Install UI component libraries (no MUI, Chakra, etc.) — use plain CSS matching the existing design system
- Use `any` type — everything must be properly typed

**You MUST:**
- Follow all existing conventions exactly (file structure, naming, CSS approach, component patterns)
- Use the existing scoring engine and profile intelligence library
- Reuse existing components (`RadarChart`, `ErrorBoundary`) where appropriate
- Match the existing dark premium visual style (see design tokens below)
- Ensure all new code passes `npm run build` and `npm run lint` with zero errors
- Write Vitest unit tests for all new scoring/logic functions

---

## EXISTING PROJECT STRUCTURE

```
renaissance-app/
├── src/
│   ├── __tests__/                    # Vitest tests
│   │   ├── profile-intelligence.test.ts
│   │   └── scoring.test.ts
│   ├── components/
│   │   ├── About/AboutSection.tsx + .css
│   │   ├── Archetypes/ArchetypesSection.tsx + .css
│   │   ├── Assessment/AssessmentSection.tsx + .css
│   │   ├── Dashboard/DashboardSection.tsx + .css
│   │   ├── Hero/Hero.tsx + .css
│   │   ├── Nav/Nav.tsx + .css
│   │   ├── QuickPulse/QuickPulseOverlay.tsx + .css   ← REFERENCE PATTERN
│   │   ├── RadarChart/RadarChart.tsx + .css           ← REUSE THIS
│   │   ├── Results/ResultsPage.tsx + .css
│   │   └── common/ErrorBoundary.tsx + .css            ← REUSE THIS
│   ├── data/
│   │   ├── assessments.ts           # Assessment mode configs, archetype info
│   │   └── quick-pulse-module.json  # 10-question Quick Pulse data
│   ├── hooks/
│   │   ├── useAnimatedCounter.ts
│   │   └── useReveal.ts
│   ├── lib/
│   │   ├── profile-intelligence.ts  # Narrative, weak domains, curriculum
│   │   └── scoring.ts              # Raw scores, normalization, archetypes, balance
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css              # Design tokens
│   ├── types/
│   │   └── index.ts                # ALL TypeScript types
│   ├── App.tsx                     # Routes: "/" and "/results"
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tsconfig.app.json
└── tsconfig.json
```

---

## EXISTING DESIGN TOKENS (use these exactly)

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

## EXISTING TYPE SYSTEM (the types you must use and extend)

```typescript
// These types already exist in src/types/index.ts — DO NOT REDEFINE THEM

export type DomainKey =
  | 'leadership' | 'creativity' | 'strategy' | 'tech_proficiency'
  | 'problem_solving' | 'critical_thinking' | 'adaptability' | 'data_analysis';

export type ArchetypeKey = 'polymath' | 'strategist' | 'builder' | 'leader';
export type LevelLabel = 'Emerging' | 'Developing' | 'Functional' | 'Strong' | 'Signature';
export type DomainScores = Record<DomainKey, number>;
export type DomainLevels = Record<DomainKey, LevelLabel>;

export interface QuestionOption {
  id: string;
  label: string;
  weights: Partial<Record<DomainKey, number>>;
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

export interface AssessmentResult {
  assessment_id: string;
  assessment_name: string;
  completed_at: string;
  response_count: number;
  responses: QuestionResponse[];
  scores: DomainScores;
  levels: DomainLevels;
  top_strengths: DomainKey[];
  growth_domains: DomainKey[];
  archetype: ArchetypeResult;
  balance_index: number;
  recommended_modules: string[];
}
```

---

## EXISTING SCORING ENGINE (you MUST use these functions)

The file `src/lib/scoring.ts` exports these functions. **Call them — do not reimplement them:**

```typescript
computeRawScores(responses, questions, domainKeys) → DomainScores
computeMaxPossible(questions, domainKeys) → DomainScores
normalize(raw, maxPossible) → DomainScores  // Maps to 0-100
computeLevels(scores) → DomainLevels
computeArchetype(scores, archetypes) → ArchetypeResult
computeBalanceIndex(scores) → number
getTopStrengths(scores, count) → DomainKey[]
getGrowthDomains(scores, count) → DomainKey[]
getRecommendedModules(growthDomains, moduleMap) → string[]
// There is NO computeFullResult equivalent for Deep Dive — you must compose the pipeline yourself
```

The file `src/lib/profile-intelligence.ts` exports:
```typescript
generateProfileIntelligence(result: AssessmentResult) → ProfileIntelligence
```
This works with ANY AssessmentResult regardless of source. Use it for Deep Dive results too.

---

## WHAT TO BUILD

### 1. Deep Dive Question Bank (`src/data/deep-dive-module.json`)

Create a JSON file with this exact schema:

```typescript
interface DeepDiveModule {
  module_id: "deep_dive_v1";
  module_name: "The Deep Dive";
  version: 1;
  estimated_minutes: 18;
  confidence_label: "High Fidelity";
  intro: {
    headline: string;
    body: string;
    bullets: string[];
  };
  // Reuse the same domain and level definitions as Quick Pulse
  domains: Domain[];      // Same 8 domains
  levels: Level[];        // Same 5 levels
  starter_module_map: Record<DomainKey, string>;  // Same map
  archetypes: ArchetypeDefinition[];  // Same 4 archetypes

  // Core questions: asked to everyone (8 questions, one per domain)
  core_questions: Question[];

  // Adaptive probe questions: triggered when a domain score is uncertain
  // Each domain has 2-3 probe questions
  probe_questions: Record<DomainKey, Question[]>;

  // Scenario questions: multi-part scenarios that test cross-domain thinking
  scenarios: Scenario[];
}

interface Scenario {
  id: string;
  title: string;
  context: string;  // 2-3 sentence scenario setup
  questions: Question[];  // 2-3 follow-up questions about this scenario
  // Each question's weights should span multiple domains
}
```

**Question design rules:**
- 8 core questions: one per domain, 4 options each, behavioral/situational framing
- 16 probe questions: 2 per domain, triggered when core question response gives ambiguous signal
- 4 scenarios with 2-3 questions each (8-12 scenario questions total)
- Total possible questions: 8 core + up to 16 probes + 8-12 scenario = 32-36 max
- Typical path: 8 core + 4-6 probes + 8 scenario = 20-22 questions
- All questions use the same `Question` and `QuestionOption` types as Quick Pulse
- Weight values should range from 0 to 4 (same scale as Quick Pulse)
- Each option should affect 1-3 domains (not all 8)
- Questions should feel like workplace scenarios, not academic test items

**Example core question (for reference — write all originals):**
```json
{
  "id": "dd_core_strategy_01",
  "prompt": "Your team has three promising project directions but resources for only one. The data is inconclusive. How do you approach the decision?",
  "options": [
    {
      "id": "dd_core_strategy_01_a",
      "label": "Run small experiments on all three before committing — let early evidence narrow the field",
      "weights": { "strategy": 3, "data_analysis": 2 }
    },
    {
      "id": "dd_core_strategy_01_b",
      "label": "Map second-order consequences of each path and choose the one with the best risk-adjusted upside",
      "weights": { "strategy": 4, "critical_thinking": 2 }
    },
    {
      "id": "dd_core_strategy_01_c",
      "label": "Consult stakeholders across teams to find the option with the most organizational alignment",
      "weights": { "leadership": 3, "adaptability": 1 }
    },
    {
      "id": "dd_core_strategy_01_d",
      "label": "Pick the most technically feasible option and iterate from there — momentum matters more than analysis",
      "weights": { "problem_solving": 2, "tech_proficiency": 2 }
    }
  ]
}
```

### 2. Adaptive Branching Logic (`src/lib/deep-dive-engine.ts`)

Create a new file that implements the adaptive flow:

```typescript
// Exports needed:

interface DeepDiveState {
  phase: 'core' | 'probing' | 'scenarios' | 'complete';
  coreResponses: QuestionResponse[];
  probeResponses: QuestionResponse[];
  scenarioResponses: QuestionResponse[];
  currentQuestionIndex: number;
  probeDomains: DomainKey[];  // Domains selected for probing
  currentScenarioIndex: number;
  totalExpectedQuestions: number;  // Updates as probes are selected
}

// Initialize a new Deep Dive session
function initDeepDive(moduleData: DeepDiveModule): DeepDiveState;

// Get the current question to display
function getCurrentQuestion(state: DeepDiveState, moduleData: DeepDiveModule): Question | null;

// Get the current scenario context (if in scenario phase)
function getCurrentScenarioContext(state: DeepDiveState, moduleData: DeepDiveModule): string | null;

// Submit an answer and advance state
function submitAnswer(state: DeepDiveState, response: QuestionResponse, moduleData: DeepDiveModule): DeepDiveState;

// Go back one question (within current phase only)
function goBack(state: DeepDiveState): DeepDiveState;

// Get progress info for UI
function getProgress(state: DeepDiveState): { current: number; total: number; phase: string; percent: number };

// Compute final result when state.phase === 'complete'
function computeDeepDiveResult(state: DeepDiveState, moduleData: DeepDiveModule): AssessmentResult;
```

**Adaptive probe selection logic:**
After all 8 core questions are answered:
1. Compute interim scores from core responses only
2. Identify domains where the score falls in an "uncertain band" (40-65 range)
3. Also probe any domain where only 1 core question contributed signal
4. Select up to 6 probe domains max (to keep total time under 18 min)
5. Set `probeDomains` and update `totalExpectedQuestions`

**Scoring combination:**
- Core responses, probe responses, and scenario responses all feed into the same `computeRawScores` pipeline
- Combine all responses into a single `QuestionResponse[]` array
- Use the combined question list (core + selected probes + scenarios) for `computeMaxPossible`
- Then normalize, compute levels, archetype, balance index as usual

### 3. Deep Dive Overlay Component (`src/components/DeepDive/DeepDiveOverlay.tsx` + `.css`)

**Follow the exact same pattern as `QuickPulseOverlay.tsx`:**
- Full-screen modal overlay with `role="dialog" aria-modal="true"`
- Same screen states: `'intro' | 'question' | 'calculating' | 'results'`
- Same close/escape behavior
- Same localStorage persistence pattern (use key `renaissance_deep_dive_result`)
- Same slide transition animation between questions
- Same results screen layout (archetype, radar chart, domain scores, strengths/growth, curriculum)

**Differences from Quick Pulse:**
- Show current phase label in progress bar: "Core Questions", "Adaptive Probes", "Scenarios"
- During scenario phase, show the scenario context text above the question
- Progress bar must handle variable total (updates when probes are selected)
- Show a brief "Analyzing your profile..." interstitial between core and probe phases
- Intro screen copy should emphasize "18 minutes", "scenario-based", "higher confidence"

**Component interface:**
```typescript
interface DeepDiveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: AssessmentResult, intelligence: ProfileIntelligence) => void;
}
```

### 4. Retake Delta Comparison

When a Deep Dive result exists AND a Quick Pulse result exists in localStorage:
- In the results screen, show a "Compare with Quick Pulse" section
- Display side-by-side domain scores with delta arrows (↑ ↓ →)
- Show archetype change if different
- Show balance index change

```typescript
// Add to src/lib/deep-dive-engine.ts
interface RetakeDelta {
  domain_deltas: Record<DomainKey, { previous: number; current: number; change: number }>;
  archetype_changed: boolean;
  previous_archetype: ArchetypeKey;
  balance_delta: number;
}

function computeRetakeDelta(quickPulseResult: AssessmentResult, deepDiveResult: AssessmentResult): RetakeDelta;
```

### 5. Integration Points

**File: `src/App.tsx`**
- Import `DeepDiveOverlay` and `loadSavedDeepDiveResult`
- Add state: `const [ddOpen, setDdOpen] = useState(false);`
- Add handler: `handleDeepDiveComplete` (same pattern as `handleAssessmentComplete`)
- Render `<DeepDiveOverlay>` alongside `<QuickPulseOverlay>`
- In `useEffect`, also check for saved Deep Dive result

**File: `src/components/Assessment/AssessmentSection.tsx`**
- The "Deep Dive" assessment card should trigger `onStartDeepDive` callback when clicked
- Add `onStartDeepDive: () => void` to AssessmentSection props

**File: `src/data/assessments.ts`**
- No changes needed — the "deep" mode config already exists with mock data

### 6. Types to Add (`src/types/index.ts`)

Append these to the existing types file. **Do not modify existing types:**

```typescript
// ── Deep Dive Types ──

export interface Scenario {
  id: string;
  title: string;
  context: string;
  questions: Question[];
}

export interface DeepDiveModule {
  module_id: string;
  module_name: string;
  version: number;
  estimated_minutes: number;
  confidence_label: string;
  intro: {
    headline: string;
    body: string;
    bullets: string[];
  };
  domains: Domain[];
  levels: Level[];
  starter_module_map: Record<DomainKey, string>;
  archetypes: ArchetypeDefinition[];
  core_questions: Question[];
  probe_questions: Record<DomainKey, Question[]>;
  scenarios: Scenario[];
}

export interface DeepDiveState {
  phase: 'core' | 'probing' | 'scenarios' | 'complete';
  coreResponses: QuestionResponse[];
  probeResponses: QuestionResponse[];
  scenarioResponses: QuestionResponse[];
  currentQuestionIndex: number;
  probeDomains: DomainKey[];
  currentScenarioIndex: number;
  totalExpectedQuestions: number;
}

export interface RetakeDelta {
  domain_deltas: Record<DomainKey, { previous: number; current: number; change: number }>;
  archetype_changed: boolean;
  previous_archetype: ArchetypeKey;
  balance_delta: number;
}
```

---

## TESTS TO WRITE (`src/__tests__/deep-dive-engine.test.ts`)

Test the following:
1. `initDeepDive` returns correct initial state
2. `getCurrentQuestion` returns core questions in order during core phase
3. `submitAnswer` advances state correctly through all phases
4. Probe selection: domains in 40-65 range are selected for probing
5. Probe selection: max 6 domains probed
6. `getProgress` returns correct percentages at various states
7. `computeDeepDiveResult` produces valid `AssessmentResult` with correct assessment_id
8. `computeRetakeDelta` correctly calculates deltas between two results
9. All combined responses (core + probe + scenario) feed into scoring pipeline
10. Back navigation works within a phase but does not cross phase boundaries

---

## CSS CONVENTIONS

Follow these patterns from the existing codebase:
- Use BEM-ish naming: `.dd-overlay`, `.dd-container`, `.dd-question-card`, `.dd-option.is-selected`
- Prefix all classes with `dd-` (Deep Dive) to avoid collisions
- Use CSS custom properties from `tokens.css` — never hardcode colors
- Panel backgrounds: `background: var(--panel); border: 1px solid var(--border);`
- Gold accents: `color: var(--gold);` or `border-color: var(--gold);`
- Transitions: `transition: all 0.3s ease;`
- Include `@media (prefers-reduced-motion: reduce)` for all animations
- Mobile breakpoint: `@media (max-width: 640px)`

---

## VERIFICATION CHECKLIST

Before considering this complete, verify:
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test` passes (existing + new tests)
- [ ] Deep Dive can be started from the Assessment section
- [ ] All 3 phases flow correctly (core → probes → scenarios → results)
- [ ] Progress bar updates dynamically when probe count is determined
- [ ] Scenario context is displayed above scenario questions
- [ ] Results screen shows radar chart, scores, archetype, curriculum
- [ ] Retake delta shows when both Quick Pulse and Deep Dive results exist
- [ ] Back button works within each phase
- [ ] Escape key closes the overlay
- [ ] Mobile layout works at 375px width
- [ ] `prefers-reduced-motion` disables animations
- [ ] LocalStorage persistence works (reload preserves result)
- [ ] No `any` types in the codebase
- [ ] All new functions have corresponding unit tests
