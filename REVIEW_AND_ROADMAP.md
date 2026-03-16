# Renaissance Skills: Code Audit, Stability Review, and Roadmap

## Audit Summary

The Codex run produced a strong foundation: a visually polished prototype, a well-researched assessment PRD, a fully specified Quick Pulse module, and a clear phased handoff. The documentation quality is notably high — the ASSESSMENT_PRD in particular reflects real competitive research and principled product thinking.

That said, the prototype has several bugs, a few spec inconsistencies, and significant gaps between what is documented and what is built. This review covers all of it and lays out the roadmap to bring this to life.

---

## Part 1: Bugs and Inconsistencies Found

### Bug 1: Balance Index Formula Mismatch

The ASSESSMENT_PRD (line 407) and CLAUDE_QUICK_PULSE_MODULE_SPEC (line 308) both define:

```
balance_index = round(average(domain_scores) - (max - min) * 0.35)
```

But the prototype JavaScript (`renaissance-skills.html:2126`) uses:

```js
return Math.max(0, Math.round(average - spread * 0.25));
```

The multiplier is `0.25` instead of `0.35`. This means the prototype overstates balance for asymmetric profiles.

**Fix:** Change `0.25` to `0.35` to match the spec.

### Bug 2: HTML Entity in JavaScript String

At `renaissance-skills.html:2233`, the code contains:

```js
promptDescription.textContent = "Select \u201cThe LLM Mirror\u201d to generate...";
```

This renders the raw HTML entities `"` and `"` as literal text instead of smart quotes. The string should use actual Unicode characters or standard quotes.

### Bug 3: Mobile Navigation Has No Menu

At viewport widths below 640px, the nav links and CTA are hidden via `display: none` (`renaissance-skills.html:1310-1312`) with no hamburger menu or alternative navigation. Users on mobile have zero top-level navigation.

### Bug 4: Deprecated Copy Fallback

`document.execCommand("copy")` at line 2427 is deprecated and already fails silently in many modern browsers. The fallback should be removed or replaced with a proper textarea-select-copy pattern.

### Bug 5: LLM Mirror Output Schema Mismatch

The `buildMirrorPrompt()` function (line 2239) asks the LLM to return a schema with fields:
- `summary`, `archetype`, `strengths`, `weaknesses`, `learning_sequence`

But the CLAUDE_QUICK_PULSE_MODULE_SPEC defines the required output contract with different fields:
- `assessment_id`, `scores` (8 domains), `levels`, `top_strengths`, `growth_domains`, `archetype` (with key/label/confidence), `balance_index`, `recommended_modules`

If the LLM Mirror is ever connected to the scoring engine, these two contracts will not align. The mirror prompt needs to request the canonical schema.

### Bug 6: No `archetypes` Section ID Anchor

The nav link `#archetypes` (line 1388) targets `id="archetypes"` (line 1560), which works. But the `#home` anchor targets the hero section, not a true landing. Minor, but worth noting for deep-linking and SEO.

---

## Part 2: Stability and Quality Issues

### No Error Boundaries

If `quick-pulse-module.json` fails to load or contains malformed data, the page will crash silently. The spec explicitly calls for error handling (CLAUDE_QUICK_PULSE_MODULE_SPEC lines 362-370), but none exists.

### No Reduced-Motion Support

The prototype has multiple animations (`ambientShift`, `slowPulse`, `ringRotate`, reveal transitions) but no `prefers-reduced-motion` media query. This is an accessibility requirement called out in both the HANDOFF and the PRD.

### No Skip-to-Content Link

Screen readers have no way to bypass the sticky nav. Standard accessibility practice requires a visually hidden skip link.

### Contrast Concerns

The muted text color `#bcb4a3` on the dark background `#0d0d0d` may not meet WCAG AA (4.5:1) for body text. The muted-strong color `#8c8577` almost certainly fails. A formal contrast audit is needed.

### No Meta Tags

No `<meta name="description">`, no Open Graph tags, no favicon. For any public-facing deployment, these are needed.

### No Semantic Landmarks

The `<main>` element is present, but individual sections don't use `<article>` semantics consistently. The assessment cards use `<article>` correctly, but the archetype section uses `<button>` elements for cards (which is semantically correct for interactivity but lacks grouping landmarks).

---

## Part 3: What the Codex Run Got Right

These are genuinely strong:

1. **Visual design system** — consistent token usage (`--gold`, `--panel`, `--border`), premium feel, restrained palette
2. **Radar chart implementation** — custom SVG radar with polar coordinates, glow layers, dot highlights, all in vanilla JS
3. **Assessment switching** — selecting Quick Pulse / Deep Dive / LLM Mirror updates hero, console, archetype spotlight, dashboard, and development section in sync
4. **Content architecture** — skill descriptions, growth modules, timeline phases, and archetype data are all structured as JS objects, not hardcoded HTML
5. **Scroll-reveal system** — IntersectionObserver-based reveals with proper `unobserve` on first visibility
6. **Question bank** — the 10 Quick Pulse questions are well-designed, behaviorally anchored, and spread across all 8 domains
7. **Scoring spec** — normalization, level labels, archetype cluster weights, breadth bonus, and confidence formula are all clearly defined and implementable
8. **PRD research** — the ASSESSMENT_PRD references Coursera, Khan Academy, Typeform, 16Personalities, Gallup CliftonStrengths, Duolingo, ACER, and ETS with specific design implications drawn from each

---

## Part 4: Roadmap to Bring This to Life

### Phase 0: Prototype Stabilization (1-2 days)

**Goal:** Fix bugs, close spec gaps, make the prototype demo-ready.

| Task | Priority | Status |
|------|----------|--------|
| Fix balance index multiplier (0.25 → 0.35) | Critical | Done |
| Fix HTML entity rendering in JS string | Critical | Done |
| Add mobile hamburger menu | High | Done |
| Add `prefers-reduced-motion` media query | High | Done |
| Add skip-to-content link | Medium | Done |
| Add meta description + OG tags + favicon | Medium | Done |
| Run contrast audit and fix failing text | Medium | Done (all colors pass WCAG AA) |
| Align LLM Mirror prompt to canonical schema | Medium | Done |
| Remove deprecated `execCommand` fallback | Low | Done (improved with proper fallback) |

### Phase 1: Live Quick Pulse Assessment (1-2 weeks)

**Goal:** Implement the actual assessment flow from the CLAUDE_QUICK_PULSE_MODULE_SPEC.

This is the single highest-leverage build. The prototype currently shows mock data — making the Quick Pulse actually work transforms it from a demo into a product.

**Build order:**
1. Load and validate `quick-pulse-module.json` at page init
2. Build intro screen with CTA
3. Build question-by-question flow (progress bar, back/next, answer persistence)
4. Build scoring engine (raw scores → normalization → levels → archetype → balance index → recommendations)
5. Build results view (radar chart driven by real answers, archetype card, strengths/growth lists, recommended modules)
6. Wire results into the existing dashboard sections
7. Add `localStorage` persistence for completed assessment
8. Polish transitions between assessment states

**Acceptance criteria from the spec:**
- All 10 questions rendered from JSON, not hardcoded
- Scores deterministic from answer set
- Archetype deterministic from computed scores
- Back navigation preserves answers
- Result object matches the required output contract
- Mobile and desktop both work

### Phase 2: App Architecture Migration (2-3 weeks)

**Goal:** Move from single-file prototype to a maintainable application.

**Recommended stack:**
- Vite + React (or Next.js if SSR/SEO matters early)
- TypeScript for scoring models and profile types
- CSS Modules or Tailwind for design tokens
- Vitest for scoring engine unit tests

**Migration plan:**
1. Extract CSS variables into a design token file
2. Extract assessment data objects into `/data/` JSON/TS files
3. Create component hierarchy:
   - `<Nav>`, `<Hero>`, `<RadarChart>`, `<SkillNode>`
   - `<AssessmentSelector>`, `<QuickPulseFlow>`, `<QuestionCard>`, `<ResultsView>`
   - `<ArchetypeGrid>`, `<ArchetypeSpotlight>`
   - `<Dashboard>`, `<GrowthGrid>`, `<SynthesisTimeline>`
4. Extract scoring logic into pure functions in `/lib/scoring.ts`
5. Add unit tests for all scoring functions (normalization, archetype, balance index)
6. Set up routing: `/`, `/assessment/quick-pulse`, `/results`, `/development`

### Phase 3: Profile Intelligence Layer (2-3 weeks)

**Goal:** Make the platform genuinely diagnostic rather than decorative.

1. **Normalized scoring model** — ensure 0-100 scores are stable and interpretable
2. **Profile summary generation** — auto-generate a 2-3 sentence profile narrative from scores
3. **Weak-domain detection** — identify bottom 3 with severity ranking
4. **Archetype confidence display** — show users why they got their archetype (e.g., "Your Strategist score was 78 vs. Builder at 71")
5. **Curriculum recommendation engine** — map growth domains to starter modules with dependency ordering
6. **LLM Mirror structured import** — validate pasted JSON against canonical schema, show extracted scores for user confirmation before accepting

### Phase 4: Deep Dive Assessment (3-4 weeks)

**Goal:** Ship the second assessment mode with higher-confidence profiling.

1. Design 24-30 scenario-based questions
2. Implement semi-adaptive branching (probe weak/uncertain domains after first 6-8 questions)
3. Handle variable-length progress UI without misleading users
4. Generate more granular archetype rationale
5. Compute retake deltas against Quick Pulse baseline

### Phase 5: Curriculum System (3-4 weeks)

**Goal:** Connect diagnosis to actual development content.

1. Build curriculum taxonomy (domain → module → lesson)
2. Create micro-course card components and lesson page templates
3. Implement sequencing logic (dependency-aware, severity-weighted)
4. Build reading recommendation system (affiliate-ready)
5. Add progress tracking with checkpoints
6. Create reassessment loop (retake Quick Pulse after curriculum engagement)

### Phase 6: Accounts, Persistence, and Analytics (2-3 weeks)

**Goal:** Transform from tool to platform.

1. User accounts and sign-in (OAuth or magic link)
2. Saved historical assessments with timestamps
3. Progress charts over time (longitudinal radar overlay)
4. Event analytics pipeline (assessment starts, completions, CTA clicks, curriculum engagement)
5. Funnel instrumentation for conversion tracking

### Phase 7: Monetization and Premium Layer (2-3 weeks)

**Goal:** Support the business model.

1. Reading affiliate integration (Amazon, Bookshop)
2. Premium assessment tiers (Deep Dive behind paywall or freemium)
3. Coaching booking system with scheduling
4. Expert marketplace or advisor network
5. Paid synthesis plans (premium curriculum sequences)

---

## Part 5: Visual Enhancement Roadmap

The prototype's visual language is strong but can be elevated:

### Near-term (Phase 0-1)
- Replace the Vitruvian Man SVG placeholder with commissioned or licensed artwork that matches the reference image
- Add a proper logo/wordmark
- Improve radar chart with animated score fill on assessment completion
- Add micro-interactions: answer selection pulse, score counter animation, archetype reveal
- Smoother assessment flow transitions (card slide, fade between questions)

### Mid-term (Phase 2-3)
- Add a dark/light theme toggle (stretch)
- Build a shareable results card (screenshot-friendly profile summary)
- Create archetype illustration set (4 distinct visual identities)
- Add particle or constellation background effect for the hero (subtle, performance-conscious)
- Design a "profile evolution" visualization for longitudinal tracking

### Long-term (Phase 5+)
- Interactive curriculum map with visual progress
- Team view with aggregated radar overlays
- Coaching dashboard with session scheduling UI
- Mobile-first responsive redesign for assessment flow
- PWA support for offline assessment completion

---

## Part 6: Open Decisions That Need Resolution

These are carried forward from the HANDOFF and PRD, plus new ones surfaced during audit:

1. **Target audience priority** — Is this consumer-first, student-first, or professional-first? This affects copy, onboarding, and pricing.
2. **Archetype prescription level** — Are archetypes descriptive ("here's your pattern") or prescriptive ("here's what you should become")?
3. **Curriculum authoring** — Will content be authored in-house, aggregated from external sources, or AI-generated?
4. **Privacy differentiator** — Will the LLM Mirror's privacy model be a marketing differentiator?
5. **Domain model expansion** — When (if ever) to expand from 8 to 10 domains (adding Communication and Collaboration)?
6. **Question skipping** — Should Quick Pulse allow skipping, or is forced-response the right design?
7. **Team assessment** — Separate product or mode within this platform?
8. **Hosting and deployment** — Static site (Vercel/Netlify) or server-rendered (for future backend)?

---

## Recommended Immediate Actions

In priority order:

1. **Fix the 6 bugs listed above** — especially the balance index mismatch and mobile nav
2. **Build the live Quick Pulse assessment** — this is the product's front door and currently doesn't exist
3. **Add `prefers-reduced-motion` and skip link** — minimal effort, significant accessibility impact
4. **Decide on app architecture** — Vite + React or Next.js, and commit to it before Phase 2
5. **Resolve target audience** — this decision cascades into copy, pricing, and curriculum strategy
