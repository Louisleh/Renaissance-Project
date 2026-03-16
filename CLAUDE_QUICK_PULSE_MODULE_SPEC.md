# Claude Implementation Spec: Quick Pulse Module

## Purpose

This file is the implementation handoff for the first real assessment module for Renaissance Skills.

Build only `The Quick Pulse` from this spec.

Do not redesign the scoring model or copy structure unless implementation constraints require a documented change.

Use this file together with:

- `ASSESSMENT_PRD.md`
- `quick-pulse-module.json`

## Module Summary

- Module name: `The Quick Pulse`
- Version: `quick_pulse_v1`
- Goal: directional baseline profile across 8 Renaissance domains
- Length: 10 questions
- Estimated time: 3-4 minutes
- Output: scores, archetype, balance index, strengths, growth domains, and recommended next modules

## Build Goal

Implement a polished assessment experience that can plug into the Renaissance Skills prototype and later be migrated into a componentized application.

The user should be able to:

1. read what the assessment does
2. start the assessment
3. answer 10 questions one at a time
4. move backward and forward without losing responses
5. submit on the final question
6. instantly receive a result object and a rendered result view

## UX Flow

## Screen 1: Intro

Show:

- title
- short explanation
- `10 questions`
- `3-4 minutes`
- note that the result is a directional baseline
- note that the user will receive:
  - an archetype
  - an 8-domain profile
  - recommended next steps

Primary CTA:

- `Start Quick Pulse`

Secondary CTA:

- `Back to Assessment Modes`

## Screen 2: Question View

Render one question at a time.

Must include:

- progress bar
- question counter, for example `Question 3 of 10`
- question prompt
- 4 answer buttons
- `Back`
- `Next`

Rules:

- `Next` is disabled until an answer is selected
- changing an answer overwrites the previous response
- `Back` preserves the current answer
- keyboard users must be able to tab and select options

## Screen 3: Final Question State

Replace `Next` with `See My Results`.

## Screen 4: Calculating State

This can be very brief.

Show:

- short loading or transition state
- message such as `Mapping your Renaissance profile...`

Do not use a fake long loading state.

## Screen 5: Results View

Must include:

- archetype name
- short archetype description
- 8-domain score object rendered as:
  - radar chart, or
  - bar list if radar is not available yet
- top 3 strengths
- bottom 3 growth domains
- balance index
- starter modules for the growth domains

Primary CTA:

- `View Development Path`

Secondary CTAs:

- `Take the Deep Dive`
- `Retake Quick Pulse`

## Functional Requirements

## Data model

The implementation must use `quick-pulse-module.json` as the question and scoring source of truth.

Do not hardcode question copy or weights directly in the component unless absolutely necessary.

## State requirements

Track:

- current question index
- selected answers by question id
- completion status
- computed result object

## Result generation requirements

On submit:

1. compute raw domain scores from selected option weights
2. compute per-domain max possible from the question bank
3. normalize domain scores to 0-100
4. compute level labels
5. compute archetype cluster scores
6. choose archetype
7. compute balance index
8. identify top 3 strengths
9. identify bottom 3 growth domains
10. map growth domains to starter modules

## Required Output Contract

The module must return an object shaped like this:

```json
{
  "assessment_id": "quick_pulse_v1",
  "assessment_name": "The Quick Pulse",
  "completed_at": "ISO_TIMESTAMP",
  "response_count": 10,
  "responses": [
    {
      "question_id": "qp_01",
      "option_id": "a"
    }
  ],
  "scores": {
    "leadership": 0,
    "creativity": 0,
    "strategy": 0,
    "tech_proficiency": 0,
    "problem_solving": 0,
    "critical_thinking": 0,
    "adaptability": 0,
    "data_analysis": 0
  },
  "levels": {
    "leadership": "Developing",
    "creativity": "Strong",
    "strategy": "Functional",
    "tech_proficiency": "Functional",
    "problem_solving": "Strong",
    "critical_thinking": "Strong",
    "adaptability": "Functional",
    "data_analysis": "Developing"
  },
  "top_strengths": [
    "problem_solving",
    "strategy",
    "critical_thinking"
  ],
  "growth_domains": [
    "data_analysis",
    "tech_proficiency",
    "leadership"
  ],
  "archetype": {
    "key": "strategist",
    "label": "The Strategist",
    "confidence": 0.68
  },
  "balance_index": 68,
  "recommended_modules": [
    "Evidence Before Intuition",
    "Tool Fluency for Non-Specialists",
    "Influence Through Clarity"
  ]
}
```

## Scoring Rules

## Raw score calculation

For each selected answer:

- read its `weights`
- add each weight to the corresponding domain raw score

## Normalization

For each domain:

1. compute `raw`
2. compute `max_possible_for_domain`
3. normalize with:

```txt
normalized = round(20 + (raw / max_possible_for_domain) * 80)
```

If `max_possible_for_domain` is `0`, return `20`.

Clamp final values to `0-100`.

## Level labels

Use these bands:

- `0-44` → `Emerging`
- `45-59` → `Developing`
- `60-74` → `Functional`
- `75-89` → `Strong`
- `90-100` → `Signature`

## Archetype calculation

Compute four cluster scores:

```txt
leader =
  leadership * 0.45 +
  adaptability * 0.25 +
  strategy * 0.20 +
  creativity * 0.10

strategist =
  strategy * 0.40 +
  critical_thinking * 0.30 +
  data_analysis * 0.20 +
  leadership * 0.10

builder =
  tech_proficiency * 0.35 +
  problem_solving * 0.35 +
  data_analysis * 0.20 +
  adaptability * 0.10

polymath =
  creativity * 0.25 +
  strategy * 0.20 +
  critical_thinking * 0.20 +
  adaptability * 0.15 +
  leadership * 0.10 +
  problem_solving * 0.10 +
  breadth_bonus
```

### Breadth bonus

```txt
if 6 or more domains >= 60, breadth_bonus = 5
else breadth_bonus = 0
```

### Archetype selection rule

- choose the highest cluster score
- if `polymath` is within 3 points of the top score and the profile spread is low, prefer `polymath`

### Archetype confidence

Use:

```txt
confidence = clamp((top_cluster - second_cluster) / 15, 0.35, 0.85)
```

## Balance Index

Use:

```txt
balance_index =
  round(
    average(domain_scores) -
    (max(domain_scores) - min(domain_scores)) * 0.35
  )
```

Clamp to `0-100`.

## Recommendation Rules

Starter modules should be mapped from the lowest 3 domains.

Use this mapping:

- `leadership` → `Influence Through Clarity`
- `creativity` → `Cross-Domain Idea Generation`
- `strategy` → `Systems Mapping and Leverage`
- `tech_proficiency` → `Tool Fluency for Non-Specialists`
- `problem_solving` → `Constraint Decomposition`
- `critical_thinking` → `Assumption Testing`
- `adaptability` → `Operating Under Change`
- `data_analysis` → `Evidence Before Intuition`

## UI Requirements

## Required components

- intro card
- progress bar
- question card
- answer button group
- results summary card
- strengths list
- growth domains list
- recommended modules list

## Visual behavior

- selected answers should be visually obvious
- hover and focus states must be clear
- transitions should feel premium but not slow
- mobile layout must avoid option overflow

## Accessibility Requirements

- keyboard support for all interactive elements
- `aria-live` for results and progress changes where appropriate
- sufficient contrast
- visible focus ring
- no motion-only communication

## Error Handling

Handle:

- attempt to continue without an answer
- malformed module JSON
- missing weights
- empty result set

Fallback behavior:

- show a user-friendly error state
- do not crash the page

## Suggested Implementation Order

1. Load and validate `quick-pulse-module.json`
2. Render intro screen
3. Render question flow
4. Store answers in local state
5. Compute results
6. Render results
7. Add polish and accessibility

## Acceptance Criteria

- user can complete the module end to end without reload
- all 10 questions are rendered from structured data
- result object matches the required output contract
- scores are deterministic from the answer set
- archetype is deterministic from computed scores
- lowest 3 domains map to starter modules
- progress updates correctly
- back navigation preserves answers
- mobile and desktop layouts both work

## Notes For Claude

- Preserve the Renaissance visual language where practical
- Prefer configuration-driven rendering over hardcoded question markup
- Keep the result computation isolated in pure functions so it can later be reused by Deep Dive and LLM Mirror
- Treat this as the first module in a larger assessment engine, not as a one-off quiz
