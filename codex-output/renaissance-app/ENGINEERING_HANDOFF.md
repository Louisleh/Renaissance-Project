# Renaissance Skills Engineering Handoff

## Purpose

This document is the implementation handoff for the current Renaissance Skills application state after Phases 4 through 7:

1. Deep Dive Assessment
2. Curriculum System
3. Accounts, Persistence, and Analytics
4. Monetization and Premium Layer

Phases 1 through 3 are treated here as the pre-existing foundation:

- landing page and brand shell
- Quick Pulse assessment
- scoring engine
- profile intelligence generation
- baseline results experience

This handoff is written for the final engineer responsible for turning the current codebase into a production-ready, end-to-end product.

---

## Current Product Architecture

The product now has four major layers:

1. Assessment
   - Quick Pulse already existed as the lightweight entry point.
   - Deep Dive adds a longer adaptive path using the same scoring primitives.

2. Development
   - Curriculum content, lesson pages, progress tracking, and reassessment loops now exist as a front-end learning system.

3. Identity and persistence
   - Anonymous users still work entirely in local storage.
   - Authenticated users can sync assessments, curriculum progress, and analytics into Supabase.

4. Monetization
   - Subscription tier awareness is now available throughout the UI.
   - Premium features are gated instead of removed.
   - Reading recommendations, upgrade flows, and coaching hooks are in place.

The central design choice across all phases was to preserve the anonymous, low-friction experience while layering in progressively more persistent and monetizable behavior. That means the app still works without auth, without Supabase, and without Stripe, but expands when those services are configured.

---

## High-Level Principles Used

### 1. Do not fork scoring logic

Deep Dive, curriculum, history, premium insights, and reassessment all use the existing scoring and profile-intelligence pipeline rather than inventing secondary logic paths. This keeps the product coherent and reduces the risk of contradictory profiles across surfaces.

### 2. Preserve offline-first and anonymous-first behavior

The app was intentionally kept usable for unauthenticated visitors. localStorage remains the primary immediate persistence layer, and Supabase acts as a sync and account layer, not a hard dependency for the core journey.

### 3. Gate gracefully, not harshly

Premium features are shown with blurred previews and clear upgrade prompts. Users can see what exists, which is better for conversion and less disruptive than hiding features entirely.

### 4. Prefer composable routes and thin integration layers

Each major phase introduced focused components and helper libraries instead of overloading existing overlays or pages with monolithic logic. This keeps future refactors practical.

---

## Phase 4: Deep Dive Assessment

### Goal

Add a longer, higher-confidence assessment mode that feels meaningfully different from Quick Pulse while still producing the same `AssessmentResult` shape and reusing the same scoring/profile-intelligence stack.

### What was built

- `src/data/deep-dive-module.json`
- `src/lib/deep-dive-engine.ts`
- `src/components/DeepDive/DeepDiveOverlay.tsx`
- `src/components/DeepDive/DeepDiveOverlay.css`
- `src/__tests__/deep-dive-engine.test.ts`
- routing and integration updates in `src/App.tsx`
- launch integration in `src/components/Assessment/AssessmentSection.tsx`
- new deep-dive types in `src/types/index.ts`

### Core implementation choices

#### Reuse the same scoring engine

Deep Dive computes its result by composing the existing scoring functions instead of defining a parallel scoring model. This was the correct choice because:

- Quick Pulse and Deep Dive need comparable outputs
- the rest of the system expects `AssessmentResult`
- profile intelligence and curriculum are already downstream consumers

#### Semi-adaptive rather than fully adaptive

The assessment flow uses:

- core questions for all users
- probes for uncertain domains
- scenario questions for cross-domain reasoning

This was chosen because it improves signal quality without introducing the complexity or psychometric assumptions of a fully adaptive testing engine.

#### Scenario-based UX without backend dependence

Scenario context is rendered inside the overlay and the whole mode remains self-contained. That keeps the implementation aligned with the existing Quick Pulse overlay pattern and avoids needing an orchestration service.

### How it works

1. User starts Deep Dive from the assessment section.
2. The engine initializes in `core` phase.
3. After the core set, interim scores are used to select uncertain domains for probing.
4. The engine then progresses into the scenario phase.
5. Final responses are combined and passed through the normal scoring pipeline.
6. The result is saved like any other assessment result.
7. If a Quick Pulse result already exists, the user can see deltas.

### Why this matters to the product

Deep Dive is the first strong Pro-tier anchor. It provides:

- more defensible profile outputs
- a stronger basis for curriculum sequencing
- a meaningful upgrade path from the free Quick Pulse experience

### Known risks and caveats

- Question quality is front-end embedded JSON. There is no admin CMS or analytics-backed calibration loop yet.
- Probe selection heuristics are deterministic and simple. They are appropriate for prototype-to-early-product stage, but they are not a psychometrically validated adaptive model.
- Browser-based validation was not run in this environment.

---

## Phase 5: Curriculum System

### Goal

Turn the recommendations produced by profile intelligence into an actual learning product with structured content, progress tracking, lesson pages, and reassessment prompts.

### What was built

- `src/data/curriculum.ts`
- `src/lib/curriculum-progress.ts`
- `src/components/Curriculum/CurriculumPage.tsx`
- `src/components/Curriculum/CourseOverview.tsx`
- `src/components/Curriculum/LessonView.tsx`
- supporting CSS files under `src/components/Curriculum/`
- route wiring in `src/App.tsx`
- curriculum tests in `src/__tests__/curriculum-progress.test.ts`
- curriculum types in `src/types/index.ts`

### Core implementation choices

#### Curriculum content is stored as typed application data

The lesson catalog lives in TypeScript data, not in markdown files or a CMS. This was chosen because:

- the app is still frontend-only at this layer
- the content needs strict typing for lesson IDs, prerequisites, and routing
- the implementation stays portable and easy to refactor into a future CMS

#### Progress is modeled at the lesson level but surfaced at the course level

This gives enough granularity for notes, completion, and reassessment triggers without overcomplicating the user-facing dashboards.

#### Reassessment unlocks after real progress

The reassessment suggestion appears once at least one course is completed. That reflects actual learning movement instead of offering empty retakes.

#### Locking logic respects both curriculum completion and prior competence

A course unlocks if:

- prerequisite course is completed, or
- the user already scored at least 60 in the prerequisite domain

This prevents penalizing users who already have competence in a dependency domain.

### How it works

1. Curriculum recommendations come from `generateProfileIntelligence()`.
2. The curriculum layer matches those recommendations to structured course data.
3. Progress is initialized for the recommended courses.
4. Users can view the curriculum overview, open a course, and complete lessons.
5. Notes and completion are stored locally and later synced when signed in.
6. Completing a course enables reassessment prompts and before/after comparisons.

### Why this matters to the product

Without Phase 5, the product only diagnoses. With Phase 5, it begins to prescribe and coach, which is essential for retention and future monetization.

### Known risks and caveats

- Lesson rendering is custom markdown-lite, not a full markdown parser.
- Content quality is manually authored and not yet editorially reviewed.
- There is no curriculum authoring interface or localization layer.
- No browser QA was run for all lesson routes and edge cases.

---

## Phase 6: Accounts, Persistence, and Analytics

### Goal

Make the product persistent across devices and sessions while preserving anonymous usage, then add enough analytics to measure behavior across the funnel.

### What was built

- `src/lib/supabase.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/data-sync.ts`
- `src/lib/analytics.ts`
- `src/components/Auth/AuthModal.tsx`
- `src/components/Auth/UserMenu.tsx`
- `src/components/History/HistoryPage.tsx`
- `src/components/Profile/ProfilePage.tsx`
- migrations in `supabase/migrations/001_initial_schema.sql`
- environment setup in `.env.example`
- auth/history/profile routes wired in `src/App.tsx`

### Core implementation choices

#### Supabase is additive, not mandatory

If Supabase is not configured:

- auth remains effectively disabled
- localStorage behavior continues
- the product still works

This was critical because the existing app already depended on local storage and the free-tier anonymous flow must not regress.

#### Sync layer sits between UI and storage

Instead of scattering Supabase calls through every component, the implementation introduced `data-sync.ts`. This centralizes:

- save behavior
- load behavior
- sign-in merge behavior
- analytics event writes

That reduces coupling and makes later backend changes far safer.

#### localStorage remains source-of-immediacy

Every save writes locally first, then syncs to Supabase when possible. This was chosen because:

- it keeps the app responsive
- it preserves offline-ish behavior
- it avoids blocking the user on auth or network health

#### Analytics were kept simple and event-based

A custom event layer sends structured records to Supabase, keyed by session ID and optionally user ID. That is enough to analyze funnel usage, curriculum engagement, and upgrade touchpoints without introducing a dedicated analytics vendor yet.

### How it works

1. Unauthenticated users use the product normally.
2. When they sign in, `syncOnSignIn()` reconciles local state with cloud state.
3. Assessment history becomes available from Supabase.
4. Profile data and curriculum progress can be edited or resumed across devices.
5. Analytics events track key lifecycle behaviors.

### Why this matters to the product

This phase converts a single-device prototype into an account-based platform:

- persistent identity
- longitudinal measurement
- analytics for product decisions
- a foundation for subscriptions and future billing entitlements

### Known risks and caveats

- Because the app runs on the client, all Supabase access depends on correct RLS and correct anon-key configuration.
- Deleting data from the UI depends on delete policies being present in Supabase.
- If a database already ran an older form of migration `001`, a backfill migration is required. This is why `004_delete_policies_backfill.sql` was added.
- No live Supabase environment was available for verification.
- Google OAuth, magic links, and the sync merge flow were not validated end to end here.

---

## Phase 7: Monetization and Premium Layer

### Goal

Introduce the commercial layer without breaking the free experience:

- Stripe upgrades
- subscription-aware feature gating
- curated and personalized reading
- coaching hooks

### What was built

- `src/lib/stripe.ts`
- `src/lib/subscription.ts`
- `src/contexts/SubscriptionContext.tsx`
- `src/components/Pricing/PricingPage.tsx`
- `src/components/common/UpgradeGate.tsx`
- `src/data/reading-recommendations.ts`
- `src/components/Reading/ReadingSection.tsx`
- `src/lib/coaching.ts`
- `src/components/Coaching/CoachingPage.tsx`
- subscription/coaching migrations:
  - `supabase/migrations/002_subscriptions.sql`
  - `supabase/migrations/003_coaching_requests.sql`
- type additions in `src/types/index.ts`
- subscription-aware integrations across nav, results, history, profile, curriculum, dashboard, and assessment entry

### Core implementation choices

#### Stripe is optional in development

If Stripe is not configured, the app treats users as premium for development. This was intentional because:

- it keeps the UI testable before billing is connected
- engineers can validate gated paths without mocking a billing backend

#### Gating is centralized in a reusable component

`UpgradeGate` was introduced so multiple features can be monetized consistently:

- full intelligence narrative
- Deep Dive access
- full curriculum
- unlimited history
- longitudinal chart
- shareable card
- coaching

This was better than embedding one-off tier checks throughout every component.

#### Reading recommendations are real, domain-mapped content

The reading system uses actual books mapped to domain areas. This turns monetization into part of the product value, not just a paywall.

Free users see:

- title
- author

Pro users also see:

- rationale
- affiliate links

Premium users additionally get:

- personalized ordering based on growth domains

#### Coaching has a graceful fallback

If Calendly exists, the product uses it.

If not, the app falls back to a Supabase-backed request form.

This was chosen so the coaching offer can launch before the scheduling stack is finalized.

### How it works

1. `SubscriptionContext` resolves the current tier.
2. Tier checks are applied through `hasAccess()` and `UpgradeGate`.
3. Pricing page surfaces the free, Pro, and Premium plans.
4. Checkout uses Stripe Checkout redirect if configured.
5. Profile page exposes current plan state and a portal placeholder.
6. Reading and coaching surfaces now respond to plan level.

### Why this matters to the product

This phase introduces the actual commercial model while still leaving a usable free product:

- Quick Pulse remains free
- free users still receive some curriculum visibility
- paid tiers unlock deeper assessment, longitudinal tracking, and coaching

This is the correct structure for a skills platform that needs both top-of-funnel reach and high-LTV follow-through products.

### Known risks and caveats

- There is no Stripe backend in this implementation. Subscription updates depend on future webhook or edge-function work.
- `openCustomerPortal()` is intentionally a placeholder until a backend function exists.
- Checkout and pricing table flows were not validated against a real Stripe account.
- Coaching request storage assumes Supabase is configured and migrations are applied.
- Book metadata and ISBNs were compiled from model knowledge and should be spot-checked before affiliate launch.

---

## How the Whole Product Now Fits Together

## End-to-End User Flow

### Anonymous free user

1. Lands on marketing homepage
2. Takes Quick Pulse
3. Receives basic results and preview of profile intelligence
4. Views curriculum overview
5. Can open the first lesson in each course
6. Encounters upgrade gates for deeper capabilities

### Authenticated free user

1. Signs in via magic link or Google
2. Local results sync to Supabase
3. Profile/history pages become available
4. Progress persists across devices
5. Upgrade offers become contextual and account-linked

### Pro user

1. Upgrades via Stripe Checkout
2. Gains access to Deep Dive
3. Gains full curriculum and unlimited history
4. Gains full profile intelligence and tracking
5. Gets curated reading with affiliate links

### Premium user

1. Keeps all Pro capabilities
2. Gains personalized reading order
3. Gains coaching access
4. Gains priority-support level positioning in the product model

## System dependency graph

Assessment feeds profile intelligence.

Profile intelligence feeds curriculum recommendations.

Curriculum progress feeds reassessment prompts and longitudinal comparisons.

Auth and sync make all of the above persistent across devices.

Subscription state controls which layers are visible or interactive.

Analytics observe every major step in the funnel.

This is now a coherent product skeleton rather than a set of isolated screens.

---

## Files and Responsibilities

## Assessment and intelligence

- `src/lib/scoring.ts`
- `src/lib/profile-intelligence.ts`
- `src/lib/deep-dive-engine.ts`
- `src/components/QuickPulse/QuickPulseOverlay.tsx`
- `src/components/DeepDive/DeepDiveOverlay.tsx`

## Curriculum

- `src/data/curriculum.ts`
- `src/lib/curriculum-progress.ts`
- `src/components/Curriculum/`

## Identity and sync

- `src/lib/supabase.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/data-sync.ts`
- `src/lib/analytics.ts`

## Monetization

- `src/lib/stripe.ts`
- `src/lib/subscription.ts`
- `src/contexts/SubscriptionContext.tsx`
- `src/components/Pricing/`
- `src/components/common/UpgradeGate.tsx`
- `src/components/Reading/`
- `src/components/Coaching/`

## Backend schema

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_subscriptions.sql`
- `supabase/migrations/003_coaching_requests.sql`
- `supabase/migrations/004_delete_policies_backfill.sql`

---

## Validation Gaps

These items could not be validated in the current environment.

### Toolchain validation blocked

`node` and `npm` were not available on PATH in this environment, so the following were not run:

- `npm install`
- `npm run build`
- `npm run lint`
- `npm run test`

This means dependency resolution, type-checking, lint compliance, and runtime bundle validation remain pending.

### Browser QA blocked

No browser-based validation was run for:

- route transitions
- mobile layouts
- overlay interactions
- reduced-motion behavior
- Stripe pricing table rendering
- chart rendering
- locked lesson flows

### Backend/service validation blocked

No live service integration was validated for:

- Supabase auth
- Google OAuth
- magic link login
- migration application
- RLS behavior
- Stripe Checkout
- Stripe pricing table
- coaching request persistence
- customer portal flow

---

## Potential Breaking Points and Integration Risks

### 1. Stripe checkout configuration

The frontend expects:

- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_STRIPE_PRO_PRICE_ID`
- `VITE_STRIPE_PREMIUM_PRICE_ID`

If those are missing, the app intentionally falls back to a development-unlocked state, which is useful for development but dangerous if misunderstood in staging or production.

### 2. Subscription truth source is incomplete until webhook work exists

The frontend can read `subscription_tier` from Supabase, but something server-side still needs to update that field after successful Stripe purchases. Until that exists, Checkout can redirect correctly but entitlements will not persist automatically.

### 3. Customer portal is not implemented

`openCustomerPortal()` is a placeholder. The final engineer must add a secure backend or Supabase Edge Function that creates Stripe customer portal sessions.

### 4. localStorage/cloud merge behavior should be tested with real data

The sync strategy is intentionally local-first, but merge behavior should be exercised on:

- first sign-in after anonymous usage
- sign-in on a new device
- multiple assessments of the same type
- curriculum progress divergence

### 5. Migration history nuance

If an existing Supabase project already applied an earlier version of migration `001`, editing that file alone will not update the live database. This is why `004_delete_policies_backfill.sql` exists. Apply migrations in order and confirm delete policies exist in production.

### 6. Book metadata should be verified before revenue launch

The recommendation catalog uses real titles and ISBN-style identifiers, but affiliate URLs and ISBN values should be manually spot-checked before launch.

### 7. Results/history UX will depend on real data density

The longitudinal chart and history views are structurally correct, but they should be tested with:

- one assessment
- two assessments
- mixed Quick Pulse and Deep Dive history
- many historical results

### 8. Free-tier gating logic should be QA'd carefully

Especially important surfaces:

- lessons after the first lesson
- Deep Dive CTA behavior
- history truncation
- intelligence narrative truncation
- shareable card lock state

These are correct conceptually but need real click-path verification.

---

## Recommended Deployment and Integration Order

1. Install dependencies and run local validation
   - `npm install`
   - `npm run build`
   - `npm run lint`
   - `npm run test`

2. Apply Supabase migrations
   - `001_initial_schema.sql`
   - `002_subscriptions.sql`
   - `003_coaching_requests.sql`
   - `004_delete_policies_backfill.sql`

3. Configure environment variables
   - Supabase URL and anon key
   - Stripe public key and price IDs
   - optional Stripe pricing table ID
   - optional Calendly URL

4. Validate auth and sync
   - magic link sign-in
   - Google OAuth
   - anonymous-to-authenticated sync
   - profile/history rendering

5. Validate monetization
   - pricing page
   - upgrade gates
   - checkout redirect
   - subscription tier reads from Supabase

6. Implement missing backend pieces
   - Stripe webhook or edge function to update `profiles.subscription_tier`
   - Stripe customer portal session creation
   - optional richer analytics export pipeline

7. Perform browser QA
   - desktop
   - mobile at 375px
   - reduced motion
   - unauthenticated and authenticated flows
   - free, Pro, and Premium states

---

## Recommended Next Engineering Steps

### Immediate

- run build, lint, and tests
- install new dependencies
- validate route rendering and overlay behavior
- validate all env-driven conditional logic

### Short-term

- implement Stripe webhook or Supabase Edge Function for subscription updates
- implement real customer portal redirection
- add more explicit error UI around sync failures and checkout failures
- verify and refine book metadata

### Medium-term

- move curriculum and reading content into a CMS or structured content backend
- add analytics dashboards or export tooling
- add more robust shareable-card generation
- add editorial QA and assessment calibration workflows

### Longer-term

- server-authoritative subscription entitlements
- richer cohort and longitudinal analytics
- coaching operations backend
- admin tools for content management and assessment iteration

---

## Final Notes for the Next Engineer

The codebase is now shaped like a real product, not just a landing page with a quiz:

- assessments produce structured results
- results drive a curriculum
- progress can persist
- accounts and history exist
- monetization hooks are integrated

The remaining work is mostly operational and validation-heavy rather than conceptual:

- verify the toolchain
- connect live services
- confirm gating and sync behavior in practice
- harden the billing loop

The architecture choices were intentionally conservative:

- reuse existing scoring
- keep anonymous use intact
- degrade gracefully without external services
- centralize sync and gating logic

That makes the system easier to ship incrementally, but it also means the final production step depends heavily on proper environment setup and end-to-end QA.
