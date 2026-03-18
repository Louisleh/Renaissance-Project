# Renaissance Skills Assessment PRD

## Document Control

- Product: Renaissance Skills
- Scope: Assessment system only
- Status: Draft v1
- Date: March 16, 2026
- Authoring basis:
  - Existing Renaissance PRD
  - Existing prototype and handoff
  - Research-backed patterns from learning platforms, assessment products, and personality/strengths tools

## Executive Summary

Renaissance Skills needs an assessment system that feels premium and intelligent, but also behaves like a real diagnostic product rather than a decorative quiz. The system must do three things well:

1. Get users to start and finish.
2. Produce a profile that feels specific enough to trust.
3. Turn results into an obvious next action.

The strongest patterns from reference products are consistent:

- Quick assessments work when they are short, transparent, and immediately useful.
- Learning platforms win when assessments connect directly to personalized next steps.
- Personality and strengths tools win when results are legible, identity-forming, and individualized.
- Strong assessment systems protect trust through clear privacy language, fair question design, and non-misleading score explanations.

The recommendation for Renaissance Skills is:

- Launch with one production-ready assessment first: `The Quick Pulse`.
- Keep the canonical scoring model at 8 domains in v1 for clarity and implementation speed.
- Treat scores as descriptive indicators, not percentile claims.
- Make every result screen immediately actionable with archetype, strengths, growth areas, and next curriculum moves.
- Add `The Deep Dive` only after the scoring model and recommendation engine are calibrated.
- Add `The LLM Mirror` only with a strict structured input/output schema and a clear privacy contract.

## Product Context

Renaissance Skills is built on the premise that AI compresses the value of narrow routine specialization and increases the value of cross-domain orchestration. The assessment system exists to measure a user's current skill distribution, identify over-specialization or underdevelopment, and route them into a development path that increases breadth, synthesis, and resilience.

Assessment is the front door to the product. If the assessment experience feels generic, manipulative, or vague, the curriculum and archetype layers will not feel credible.

## Problem Statement

Most users do not currently have a trustworthy way to answer these questions:

- Am I over-specialized?
- Which capabilities are genuinely strong versus merely familiar?
- What kind of Renaissance profile do I currently resemble?
- What should I work on first to become more balanced and more future-resilient?

Most existing products solve only part of this:

- Learning platforms assess domain proficiency but not whole-person skill distribution.
- Personality tests provide identity and narrative but often stop before development planning.
- Strengths tools provide self-awareness but tend to underweight weak-area balancing.

Renaissance Skills should bridge all three.

## Product Goals

### Primary goals

- Create a high-completion assessment entry point that can be finished in under 4 minutes for first-time users.
- Generate an 8-domain baseline profile that feels directionally accurate and interpretable.
- Assign one of four Renaissance archetypes in a way users can understand and explain.
- Produce immediate, personalized development recommendations based on weakest domains.
- Establish a shared output schema that future assessments can reuse.

### Secondary goals

- Encourage users to upgrade from Quick Pulse to Deep Dive for higher-confidence profiling.
- Create an assessment data model suitable for longitudinal progress tracking.
- Support future team assessments without redesigning the entire system.

## Non-Goals

- Clinical or mental health diagnosis
- High-stakes hiring selection
- IQ or aptitude testing
- Deep psychometric claims before calibration data exists
- Perfect personality typing from the Quick Pulse
- Full team assessment in v1

## Research-Derived Product Principles

### Reference patterns

| Reference product/source | Observed pattern | Design implication for Renaissance Skills |
| --- | --- | --- |
| Coursera skill assessments | Short assessments with clear structure, explicit time estimate, immediate results, and recommendations | Quick Pulse should state time and question count up front, finish quickly, and immediately route users to next steps |
| Coursera LevelSets | Baseline proficiency + personalized recommendations + ROI/progress tracking | Save a baseline profile and use it to compare future retakes and curriculum effectiveness |
| Khan Academy Mastery | Visible progress, leveled skill states, course challenges, and recommended lessons after performance | Results should show domain states and directly recommend what to do next |
| Typeform | One-question-at-a-time flow, progress indication, relevant branching, strong intro copy, and short forms | Assessment UI should feel conversational, focused, and transparent |
| 16Personalities | Fast completion, archetypal identity, trait intensity display, and team extensions | Results should include a named archetype, a narrative explanation, and future team applicability |
| Gallup CliftonStrengths | Personalized strengths report and action-oriented interpretation | Renaissance results should lead with strengths plus targeted development rather than deficiency framing alone |
| Duolingo English Test and ACER adaptive testing | Short adaptive items can increase precision and engagement by targeting appropriate difficulty | Deep Dive should use adaptive or semi-adaptive probing instead of a flat linear questionnaire |
| ETS fairness guidance | Validity, fairness, accessibility, and clear score use matter to trust | The assessment system must define intended use, fairness review, and accessible delivery from the start |

### Product principles

1. Explain the time commitment up front.
2. Ask one question at a time.
3. Do not ask irrelevant questions.
4. Keep language human and non-jargony.
5. Lead with strengths, not only deficits.
6. Translate scores into next actions immediately.
7. Make score meaning explicit and non-misleading.
8. Preserve privacy trust, especially in the LLM Mirror flow.
9. Design for fairness and accessibility, not only aesthetics.
10. Treat Quick Pulse as directional and Deep Dive as higher confidence.

## Target Users

### Primary users

- Specialists worried their expertise is vulnerable to automation
- Students and early-career professionals seeking resilient, broad capability
- Generalists who want a formal map of their synthesis profile

### Secondary users

- Managers or coaches using profiles to guide development conversations
- Teams in a future phase

## Jobs To Be Done

- “Help me understand what kind of capability profile I actually have.”
- “Show me where I am too narrow or too weak.”
- “Give me a narrative I can recognize myself in.”
- “Tell me what to work on first.”
- “Let me retake this later and see if I improved.”

## Core Decisions

### Decision 1: Keep the v1 skill model to 8 domains

The current prototype uses 8 domains:

- Leadership
- Creativity
- Strategy
- Tech Proficiency
- Problem Solving
- Critical Thinking
- Adaptability
- Data Analysis

The reference image introduces `Communication` and `Collaboration`, but expanding to 10 domains in v1 would create more scoring noise, more content overhead, and weaker early calibration.

Recommendation:

- Keep 8 domains as the canonical scoring model in v1.
- Track `Communication` as a secondary signal under `Leadership`.
- Track `Collaboration` as a secondary signal under `Leadership` and `Adaptability`.
- Revisit a 10-domain model only after enough response data exists to justify separation.

### Decision 2: Make Quick Pulse the first production assessment

Quick Pulse is the best initial module because it:

- mirrors proven 10-question quick assessments
- is easiest to implement and validate
- creates immediate onboarding value
- allows the team to gather early calibration data

## Skill Model

### Domain definitions

| Domain | Definition | What high looks like |
| --- | --- | --- |
| Leadership | Ability to align people, set direction, create clarity, and move decisions forward | Coordinating people, framing decisions, influencing action |
| Creativity | Ability to generate novel options, patterns, and reframings | Original thinking, analogy, idea generation |
| Strategy | Ability to sequence action, model tradeoffs, and identify leverage | Systems thinking, prioritization, foresight |
| Tech Proficiency | Practical fluency with tools, systems, and technical workflows | Tool comfort, prototyping, automation, digital leverage |
| Problem Solving | Ability to decompose complexity and reach workable solutions | Troubleshooting, execution logic, constraint handling |
| Critical Thinking | Ability to interrogate assumptions, weigh evidence, and reason clearly | Skepticism, rigor, analytical clarity |
| Adaptability | Ability to update plans under changing conditions | Flexibility, resilience, iteration under uncertainty |
| Data Analysis | Ability to use evidence, measurement, and quantitative signal | Metrics thinking, baselines, evidence-led decisions |

### Domain labels shown to users

- Emerging
- Developing
- Functional
- Strong
- Signature

These labels should be derived from score bands rather than shown as raw numbers alone.

## Archetype Model

The system must assign one primary archetype:

- The Polymath
- The Strategist
- The Builder
- The Leader

### Archetype intent

| Archetype | Meaning |
| --- | --- |
| Polymath | Broad, balanced profile with strong synthesis across multiple domains |
| Strategist | Strong systems thinking, evidence framing, and long-range decision logic |
| Builder | Strong technical and execution capacity; turns ideas into systems and outputs |
| Leader | Strong people alignment, direction-setting, and adaptive coordination |

### Archetype design rules

- Archetypes are descriptive, not destiny.
- Users should always see why they received a given archetype.
- A user should also see what would balance that archetype.
- The Polymath should be reserved for profiles with real breadth, not just one high score plus one medium score.

## Assessment Suite Overview

| Mode | Role | Length | Confidence | Launch phase |
| --- | --- | --- | --- | --- |
| Quick Pulse | Fast onboarding baseline | 10 questions, 3-4 minutes | Directional | Phase 1 |
| Deep Dive | Higher-fidelity diagnosis | 24-30 questions, 12-15 minutes | Moderate to high | Phase 2 |
| LLM Mirror | Privacy-first synthesis from personal material | Prompt + paste-back workflow | Variable, evidence-dependent | Phase 3 |

## Mode Requirements

## The Quick Pulse

### Purpose

- Provide a low-friction baseline profile
- Get the user to an interpretable result quickly
- Seed the curriculum engine
- Encourage transition to the Deep Dive where appropriate

### Functional requirements

- 10 scored multiple-choice questions
- One question per screen
- Visible progress indicator
- Estimated completion time shown before start
- Back/next navigation with saved answers
- Immediate results on submit
- Results include:
  - domain scores
  - archetype
  - top strengths
  - growth areas
  - balance index
  - recommended next modules

### UX requirements

- No open-ended required responses
- No matrix questions
- No more than 4 choices per question
- No scrolling inside question cards on mobile
- Completion should feel possible in one sitting without fatigue

## The Deep Dive

### Purpose

- Increase confidence in the profile
- Probe ambiguous or under-sampled domains
- Produce more precise curriculum sequencing

### Functional requirements

- 24-30 questions
- Scenario-based and behaviorally anchored items
- Semi-adaptive branching after the first 6-8 questions
- Additional probing in weak or uncertain domains
- More granular explanation of scores and archetype rationale

### Adaptive design requirements

- If early answers signal clear strength or weakness, later questions should probe depth rather than repeat the same signal
- If early answers are mixed, later questions should focus on uncertainty resolution
- Progress UI should not mislead if branch lengths differ

## The LLM Mirror

### Purpose

- Let users leverage their own private conversational history or notes
- Maintain privacy by keeping raw source material local to the user
- Translate pasted structured output into the shared scoring schema

### Functional requirements

- Generate a clear prompt for a private LLM
- Require a structured pasted response
- Validate schema before accepting the result
- Show extracted scores for user review before finalizing
- Explain what is and is not stored

### Privacy requirements

- Never require users to paste full private chats into the platform
- Default to storing only the structured summary output
- Explain that result quality depends on the quality and representativeness of the pasted evidence

## Assessment UX Requirements

### Entry screen

Must include:

- what the assessment does
- question count
- estimated time
- what the user gets at the end
- privacy note
- directional confidence note for Quick Pulse

### Question experience

Must include:

- one question at a time
- question counter
- progress indicator
- keyboard accessibility
- touch-friendly targets
- clear selected state
- ability to go back without losing answers

### Completion experience

Must include:

- immediate calculation or brief transition
- no confusing dead-end state
- clear path to results

### Results experience

Must include:

- domain graph
- named archetype
- short narrative summary
- top three strengths
- bottom three growth domains
- next recommended modules
- CTA to:
  - start development path
  - retake later
  - take the Deep Dive

## Question Design Standards

### Must-do rules

- Use clear, plain language
- Avoid loaded questions
- Avoid double-barreled questions
- Avoid obviously “correct” moralized answers
- Use realistic work/learning scenarios where possible
- Spread measurement across multiple domains
- Keep options equally plausible
- Ensure each domain appears multiple times

### Content mix

The system should use:

- behavioral preference items
- scenario-based choices
- evidence-orientation items
- execution-style items

The system should avoid:

- trivia
- academic jargon
- culture-bound idioms
- role-specific assumptions that exclude students or career-switchers

## Scoring Model

### Score philosophy

Scores are descriptive indicators derived from response patterns. They are not percentiles and should not be described as “you are better than X% of users.”

### Scoring mechanics

- Each answer option maps to weighted domain contributions
- Each domain raw score is normalized to a 0-100 range for display
- The same response data feeds:
  - domain scores
  - level labels
  - archetype assignment
  - balance index
  - recommendation seeding

### Balance index

Purpose:

- Express how even or uneven the user's profile is

Recommended v1 formula:

- `balance_index = round(average(domain_scores) - (max(domain_scores) - min(domain_scores)) * 0.35)`
- Clamp to 0-100

Interpretation:

- Higher = broader and more balanced
- Lower = more asymmetrical or specialized

### Archetype logic

Archetypes should be calculated from weighted domain clusters, not from a single highest domain.

Recommended v1 rules:

- `Leader` weighted by Leadership, Adaptability, Strategy, Creativity
- `Strategist` weighted by Strategy, Critical Thinking, Data Analysis, Leadership
- `Builder` weighted by Tech Proficiency, Problem Solving, Data Analysis, Adaptability
- `Polymath` weighted by breadth across several domains plus a balance bonus

Special rule:

- If the profile is broad and the top cluster scores are close together, prefer `Polymath`

### Confidence language

Quick Pulse should display:

- `Directional baseline`

Deep Dive should display:

- `Higher-confidence profile`

LLM Mirror should display:

- `Evidence-dependent synthesis`

## Fairness, Accessibility, and Trust Requirements

### Fairness

- Review questions for cultural bias
- Avoid domain descriptions that assume a specific profession, education level, or geography
- Ensure that no archetype is framed as inherently superior
- Avoid outcome messaging that pathologizes low scores

### Accessibility

- Keyboard-navigable interactions
- High-contrast text and selected states
- Screen-reader friendly question structure
- Reduced-motion support
- Large tap targets on mobile
- No information conveyed by color alone

### Trust and interpretability

- Explain how long it takes
- Explain what users get
- Explain how scores should be interpreted
- Explain privacy rules in the LLM Mirror flow

## Recommendation Engine Requirements

Every assessment result must map into the curriculum layer.

### V1 rule

- Bottom 3 domains become primary growth domains
- Each growth domain maps to one starter module
- The order of modules should be based on:
  - dependency logic
  - severity of weakness
  - archetype balancing needs

### Example module mapping

| Domain | Starter module |
| --- | --- |
| Leadership | Influence Through Clarity |
| Creativity | Cross-Domain Idea Generation |
| Strategy | Systems Mapping and Leverage |
| Tech Proficiency | Tool Fluency for Non-Specialists |
| Problem Solving | Constraint Decomposition |
| Critical Thinking | Assumption Testing |
| Adaptability | Operating Under Change |
| Data Analysis | Evidence Before Intuition |

## Data Model Requirements

All modes must emit the same core output contract.

### Required output fields

- assessment mode
- version
- completion timestamp
- question count
- raw response payload
- normalized domain scores
- domain level labels
- top strengths
- growth domains
- archetype
- archetype confidence
- balance index
- recommended modules

### Optional future fields

- reliability/confidence flags
- benchmark comparisons
- retake deltas
- team aggregates

## Analytics Requirements

Track at least:

- assessment start
- question viewed
- question answered
- back navigation used
- assessment completed
- result viewed
- Deep Dive CTA clicked
- development CTA clicked
- LLM Mirror prompt copied
- LLM Mirror parse success/failure

## Success Metrics

### Product metrics

- assessment start rate from landing page
- Quick Pulse completion rate
- result-to-development clickthrough rate
- Quick Pulse to Deep Dive conversion rate
- curriculum engagement after assessment
- reassessment rate after 30+ days

### Quality metrics

- user-rated “result felt accurate”
- user-rated “result felt useful”
- percentage of users who can correctly restate their archetype and top growth domain
- divergence between Quick Pulse and Deep Dive results

## Risks and Mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Assessment feels like a generic quiz | Low trust, low conversion to development | Use scenario-based items and clear result logic |
| Scores feel arbitrary | Users will reject archetype and recommendations | Show score explanations and map results directly to behaviors |
| Too many domains too early | Weak signal and implementation sprawl | Keep 8 domains in v1 |
| LLM Mirror outputs are inconsistent | Parser and user trust break | Enforce strict schema and confirmation step |
| Users interpret scores as percentiles | Misleading claims and false precision | Explicitly state scores reflect response patterns, not user-vs-user ranking |
| Progress UI becomes misleading with branching | Creates confusion and drop-off | Use fixed-length Quick Pulse and careful branching UX in Deep Dive |
| Bias in wording | Weak fairness and trust | Review items for readability, culture, and profession neutrality |

## Delivery Roadmap

## Phase 1

- Ship Quick Pulse
- Ship v1 scoring engine
- Ship archetype logic
- Ship result-to-curriculum mapping
- Store baseline profile

## Phase 2

- Launch Deep Dive
- Add semi-adaptive probing
- Improve archetype confidence logic
- Add retake deltas

## Phase 3

- Launch LLM Mirror
- Add schema validation and review step
- Add privacy-specific UX

## Phase 4

- Calibrate scoring with live data
- Refine weight matrices
- Consider Communication and Collaboration as separate domains if data supports it

## Open Product Decisions

- Should users be allowed to skip questions in Quick Pulse?
- Will Deep Dive adapt only by domain focus or also by difficulty?
- Will team assessment be a separate product or a mode built on the same engine?
- Should retake history be shown visually in the first release of persistence?
- How much explanation is enough before results become overwhelming?

## Recommendation

Do not move straight into implementing all three assessment modes. Build the shared scoring contract, launch Quick Pulse, collect completion and credibility data, and then expand. That path is both faster and more defensible.

## Research Appendix

These sources informed the design recommendations above:

- Coursera Java Skill Assessment
  - 10 multiple-choice questions
  - 5-10 minutes
  - immediate results with course recommendations
  - [Source](https://www.coursera.org/resources/java-skill-assessment)
- Coursera LevelSets
  - baseline proficiency
  - personalized recommendations
  - progress tracking against baseline
  - [Source](https://www.coursera.org/business/levelsets)
- Khan Academy Course and Unit Mastery
  - mastery points
  - course challenge sampling
  - recommended lessons after assessment
  - [Source](https://support.khanacademy.org/hc/en-us/articles/115002552631-What-are-Course-and-Unit-Mastery)
- Typeform mobile form and survey guidance
  - one question at a time
  - conversational flow
  - relevant questions only
  - time estimate and progress bar
  - short forms outperform long ones
  - [Source 1](https://www.typeform.com/blog/mobile-form-design-best-practices)
  - [Source 2](https://help.typeform.com/hc/en-us/articles/360051557892-Activate-the-Progress-bar)
  - [Source 3](https://www.typeform.com/es/blog/survey-design)
- 16Personalities
  - fast completion
  - archetypal identity
  - trait percentages should not be treated as comparisons to other people
  - team extensions
  - [Source 1](https://www.16personalities.com/)
  - [Source 2](https://www.16personalities.com/articles/strength-of-individual-traits)
- Gallup CliftonStrengths
  - personalized strengths reports
  - action-oriented interpretation
  - results explain what users naturally do best and how to apply it
  - [Source 1](https://support.gallup.com/hc/en-us/articles/44814944204051-What-does-the-CliftonStrengths-assessment-measure)
  - [Source 2](https://www.gallup.com/cliftonstrengths/en/253850/cliftonstrengths-for-individuals.aspx)
- Duolingo English Test
  - short adaptive item flow
  - one section
  - questions are short and predictive
  - [Source](https://blog.duolingo.com/duolingo-english-test-readiness/)
- ACER adaptive testing guidance
  - tests should not be too easy or too hard
  - adaptive pathways improve engagement and diagnostic precision
  - [Source](https://schoolsupport.acer.org/hc/en-au/articles/28698532058137-What-is-adaptive-testing)
- ETS fairness guidance
  - validity
  - fairness
  - accessibility
  - intended-use discipline
  - [Source](https://www.de.ets.org/about/fairness/review-publications.html)
