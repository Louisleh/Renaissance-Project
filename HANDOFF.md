# Renaissance Skills Handoff

## Deliverables

- `renaissance-skills.html`
  - Single-file vanilla HTML/CSS/JS prototype
  - Dark premium landing page and interactive single-page experience
- `HANDOFF.md`
  - Implementation summary
  - Recommended next steps
  - Suggested delivery phases from prototype to product

## What Is Implemented

### Product sections

- Sticky top navigation with smooth scroll links
- Hero with a custom gold radar/spider-chart composition
- Interactive skill labels around the hero graph
- Tri-modal assessment section:
  - The Quick Pulse
  - The Deep Dive
  - The LLM Mirror
- Archetype section:
  - The Polymath
  - The Strategist
  - The Builder
  - The Leader
- Development dashboard with:
  - Targeted Growth view
  - AI-Optimized Synthesis Path view
- Future placeholders for:
  - Recommended Reading
  - Coaching Session booking
- About section aligned to the PRD thesis

### Interactivity

- Smooth scrolling for navigation and CTA actions
- Hover and focus glow states on skill labels
- Assessment switching that updates:
  - hero messaging
  - assessment preview card
  - archetype spotlight
  - development recommendations
- Archetype spotlight switching
- Toggle between growth grid and synthesis roadmap
- LLM Mirror prompt generation with clipboard copy
- Scroll-based reveal animations
- Active nav highlighting based on viewport section

### Design direction

- Premium dark theme with charcoal, black, and faded gold
- Serif-driven headings and restrained sans-serif body copy
- Custom gradients, glow layers, rings, and panels
- Responsive layout across desktop and mobile breakpoints

## Current Technical Shape

This is intentionally a prototype, not yet a production app.

- All logic is in a single file for portability and quick iteration
- Content is powered by static JavaScript objects
- No persistence layer exists
- No real assessment engine exists yet
- No backend, analytics, auth, user accounts, or CMS exist yet
- The “Vitruvian Man” is a custom SVG placeholder, not branded final art
- The radar graph is visually interactive but not connected to real user inputs

## Recommended Immediate Next Steps

### 1. Lock the product spec before scaling code

Decide these first:

- exact assessment questions for Quick Pulse
- scenario framework for Deep Dive
- expected input and output contract for LLM Mirror
- scoring rubric for all eight skill domains
- archetype assignment logic
- what “balance index” actually means mathematically

Without these, engineering will build the shell faster than the product logic matures.

### 2. Move from single-file prototype to app architecture

Recommended direction:

- `Next.js` or `Vite + React` for maintainability
- componentized sections
- shared design token system
- structured content/config layer
- typed profile and scoring models

Suggested initial structure:

```txt
src/
  components/
  sections/
  data/
  lib/
  styles/
  types/
```

### 3. Replace static mock data with real scoring

Build:

- domain score model
- archetype scoring rules
- growth recommendation engine
- content mapping from weak domain -> curriculum module -> reading/coaching recommendation

### 4. Add user-state persistence

At minimum:

- save chosen assessment mode
- save scores and selected archetype
- restore dashboard state on refresh

Prototype path:

- `localStorage`

Production path:

- hosted database plus authenticated user profiles

### 5. Tighten accessibility and production polish

Add:

- reduced-motion support
- stronger keyboard treatment
- semantic landmarks review
- contrast audit
- screen-reader labels for radar interactions
- mobile tap target audit

## Phased Path To Final Vision

## Phase 0: Prototype Refinement

Goal: turn this into a cleaner clickable narrative prototype.

Ship:

- final copy pass
- stronger mobile spacing pass
- branded illustration/art direction
- richer microinteractions
- cleaner loading of assessment transitions

Output:

- investor/demo-ready prototype
- stakeholder review artifact

## Phase 1: Functional Frontend MVP

Goal: real product shell with live state, still frontend-heavy.

Ship:

- componentized frontend
- real assessment flows
- stateful score calculation
- actual radar graph driven by answers
- archetype calculation
- saved session state

Output:

- usable MVP without full backend intelligence

## Phase 2: Profile Intelligence Layer

Goal: make the platform meaningfully diagnostic.

Ship:

- normalized scoring model
- profile summary generation
- weak-domain detection
- balance index computation
- curriculum recommendation engine
- LLM Mirror structured import flow

Output:

- real profiling product rather than a visual demo

## Phase 3: Curriculum System

Goal: connect diagnosis to development.

Ship:

- curriculum taxonomy
- micro-course cards and lesson pages
- sequencing logic
- reading recommendation system
- progress tracking
- checkpoints and reassessment loop

Output:

- “assessment to growth” closed loop

## Phase 4: Account, Analytics, and Retention

Goal: transform the tool into a repeat-use platform.

Ship:

- user accounts and sign-in
- saved historical assessments
- progress charts over time
- notifications/reminders
- event analytics
- funnel instrumentation

Output:

- measurable activation and retention system

## Phase 5: Monetization and Premium Layer

Goal: support the business model from the PRD.

Ship:

- reading affiliate integration
- premium assessment tiers
- coaching booking
- expert marketplace or advisor network
- paid synthesis plans

Output:

- monetizable product with tiered value

## Strong Recommendations

### Recommendation 1

Do not keep the final product as a single HTML file. That was correct for the prototype request, but it will become a liability immediately once real scoring, content, persistence, and experimentation begin.

### Recommendation 2

Treat the scoring model as the real product. The UI can be beautiful, but the moat here is the quality of:

- assessment design
- synthesis logic
- archetype assignment
- development recommendations

### Recommendation 3

Define a strict schema for LLM Mirror outputs before building the backend. If users paste inconsistent summaries, the parser and experience will collapse quickly.

Recommended fields:

- domain scores
- confidence per domain
- strengths
- weaknesses
- archetype
- evidence notes
- recommended sequence

### Recommendation 4

Use a content strategy from day one for curriculum modules. Even a sophisticated engine will feel weak if the actual modules are vague, generic, or repetitive.

## Highest-Leverage Build Order

If the goal is fastest path to a credible MVP, build in this order:

1. Real Quick Pulse assessment
2. Radar graph driven by actual answers
3. Archetype logic
4. Development recommendation engine
5. LLM Mirror import flow
6. Deep Dive assessment
7. Accounts and persistence
8. Monetization layer

## Suggested Success Metrics

Once productized, measure:

- assessment completion rate
- CTA to assessment start rate
- assessment to dashboard completion rate
- dashboard to curriculum engagement rate
- return rate for reassessment
- reading/coaching conversion rate

## Open Decisions Still Needed

- Is the platform consumer-first, student-first, or professional-first?
- Are archetypes mostly descriptive or prescriptive?
- Will curriculum be authored in-house or aggregated?
- Will the product emphasize privacy as a differentiator for LLM Mirror?
- Will there be one canonical skill model or separate models by user segment?

## Final Notes

This prototype is strong as a visual and interaction starting point. The next critical move is not more front-end flourish. It is turning the current static assumptions into a defensible scoring and recommendation system, then rebuilding the interface on a maintainable application foundation.
