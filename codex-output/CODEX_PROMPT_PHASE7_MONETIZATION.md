# Codex Build Prompt: Phase 7 — Monetization and Premium Layer

## CRITICAL CONTEXT — READ FIRST

You are working on an existing **Vite + React + TypeScript** application called Renaissance Skills. The app has user accounts (Supabase auth), assessment flows, curriculum system, and analytics. Your job is to add the **monetization layer**: Stripe payments, premium content gating, reading affiliate links, and a coaching booking system.

**Prerequisites:** This phase depends on Phases 4-6 being complete. If they are not, adapt accordingly — but the core concepts (assessment results, curriculum, user accounts) should exist.

**You MUST NOT:**
- Change existing scoring logic
- Change existing type definitions (only extend)
- Break functionality for free-tier users — free users keep full access to Quick Pulse + basic curriculum
- Store credit card numbers or payment details in your database — Stripe handles all payment data
- Use `any` type

**You MUST:**
- Follow existing conventions (file structure, naming, CSS, component patterns)
- Use Stripe Checkout (redirect-based) — not embedded payment forms
- Ensure graceful degradation if Stripe is not configured
- Match the existing dark premium visual style
- Ensure `npm run build` and `npm run lint` pass with zero errors

---

## EXISTING CONTEXT

### Stack
- Vite + React 19 + TypeScript 5.9
- react-router-dom v7, Supabase (auth + PostgreSQL)
- Plain CSS with design tokens

### Design tokens
```css
:root {
  --bg: #0d0d0d; --bg-deep: #090909; --panel: rgba(22, 21, 18, 0.88);
  --gold: #d4af37; --gold-strong: #b5952f; --text: #e6e6e6;
  --muted: #bcb4a3; --muted-strong: #8c8577;
  --border: rgba(212, 175, 55, 0.2); --shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  --heading-font: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  --body-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
}
```

### Existing types
```typescript
type DomainKey = 'leadership' | 'creativity' | 'strategy' | 'tech_proficiency'
  | 'problem_solving' | 'critical_thinking' | 'adaptability' | 'data_analysis';

interface AssessmentResult { /* full result with scores, archetype, etc. */ }
interface CurriculumProgress { /* course-level and lesson-level progress */ }
interface UserProfile { id: string; display_name: string; email: string; created_at: string; }
```

---

## TIER STRUCTURE

Define three tiers:

| Feature | Free | Pro ($12/month) | Premium ($29/month) |
|---------|------|-----------------|---------------------|
| Quick Pulse assessment | Yes | Yes | Yes |
| Basic results (archetype, scores) | Yes | Yes | Yes |
| Profile Intelligence narrative | Summary only | Full | Full |
| Deep Dive assessment | No | Yes | Yes |
| Curriculum: first lesson per course | Yes | Yes | Yes |
| Curriculum: full courses | No | Yes | Yes |
| Assessment history | Last 2 | Unlimited | Unlimited |
| Longitudinal tracking chart | No | Yes | Yes |
| Shareable profile card | No | Yes | Yes |
| Recommended reading with affiliate links | Basic list | Curated per domain | Curated + personalized |
| Coaching booking | No | No | Yes |
| Priority support | No | No | Yes |

---

## WHAT TO BUILD

### 1. Stripe Integration Setup

**Install:** `npm install @stripe/stripe-js`

**Create:** `src/lib/stripe.ts`
```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

export const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;
export const isStripeConfigured = !!stripePublicKey;
```

**Create:** `.env.example` additions:
```
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
VITE_STRIPE_PRICING_TABLE_ID=prctbl_xxx
```

**IMPORTANT:** You are NOT building a Stripe backend. The user will set up Stripe products and a Pricing Table in their Stripe Dashboard. You only need:
- The Stripe.js client for redirecting to Checkout
- A Stripe Pricing Table embed component
- Webhook handling is out of scope — the user will configure Supabase Edge Functions separately

### 2. Subscription State (`src/lib/subscription.ts`)

```typescript
export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface SubscriptionState {
  tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

// Check subscription from Supabase profile
export async function getSubscription(userId: string): Promise<SubscriptionState>;

// Check if a feature is available for the current tier
export function hasAccess(tier: SubscriptionTier, feature: FeatureKey): boolean;

export type FeatureKey =
  | 'deep_dive'
  | 'full_curriculum'
  | 'full_intelligence'
  | 'unlimited_history'
  | 'longitudinal_chart'
  | 'shareable_card'
  | 'curated_reading'
  | 'personalized_reading'
  | 'coaching'
  | 'priority_support';

// Feature access matrix
const featureMatrix: Record<FeatureKey, SubscriptionTier[]> = {
  deep_dive: ['pro', 'premium'],
  full_curriculum: ['pro', 'premium'],
  full_intelligence: ['pro', 'premium'],
  unlimited_history: ['pro', 'premium'],
  longitudinal_chart: ['pro', 'premium'],
  shareable_card: ['pro', 'premium'],
  curated_reading: ['pro', 'premium'],
  personalized_reading: ['premium'],
  coaching: ['premium'],
  priority_support: ['premium'],
};
```

### 3. Database Schema Addition (`supabase/migrations/002_subscriptions.sql`)

```sql
ALTER TABLE public.profiles
  ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_period_end TIMESTAMPTZ,
  ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;

-- Index for webhook lookups
CREATE INDEX idx_profiles_stripe ON public.profiles(stripe_customer_id);
```

### 4. Subscription Context (`src/contexts/SubscriptionContext.tsx`)

```typescript
interface SubscriptionContextValue {
  tier: SubscriptionTier;
  loading: boolean;
  hasAccess: (feature: FeatureKey) => boolean;
  openPricing: () => void;        // Opens pricing modal
  isTrialEligible: boolean;
}
```

- Wraps the app alongside AuthContext
- Fetches subscription state when user is authenticated
- For unauthenticated users, tier = 'free'
- If Stripe is not configured, tier = 'premium' (unlock everything for development)
- Caches tier in state to avoid repeated Supabase queries

### 5. Pricing Page (`src/components/Pricing/PricingPage.tsx` + `.css`)

New route: `/pricing`

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Choose Your Path                                         │
│  Unlock your full Renaissance potential                   │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Free       │  │   Pro ★      │  │   Premium        │ │
│  │              │  │   $12/mo     │  │   $29/mo         │ │
│  │  • QP only   │  │  • All above │  │  • All above     │ │
│  │  • Basic     │  │  • Deep Dive │  │  • Coaching      │ │
│  │    results   │  │  • Full      │  │  • Personalized  │ │
│  │  • 1 lesson  │  │    curriculum│  │    reading       │ │
│  │    preview   │  │  • History   │  │  • Priority      │ │
│  │              │  │  • Tracking  │  │    support       │ │
│  │  [Current]   │  │  [Upgrade →] │  │  [Upgrade →]     │ │
│  └─────────────┘  └──────────────┘  └──────────────────┘ │
│                                                           │
│  All plans include unlimited Quick Pulse assessments      │
│  Cancel anytime • No long-term commitment                 │
└──────────────────────────────────────────────────────────┘
```

**Behavior:**
- If user is not signed in, "Upgrade" buttons prompt sign-in first
- If user is on free tier, show "Upgrade" on Pro and Premium
- If user is on Pro, show "Current" on Pro and "Upgrade" on Premium
- "Upgrade" clicks redirect to Stripe Checkout via `stripe.redirectToCheckout()`
- Show a "Most Popular" badge on Pro tier
- After successful checkout, Stripe webhook updates the Supabase profile (out of scope for frontend — just document the expected flow)

### 6. Upgrade Gate Component (`src/components/common/UpgradeGate.tsx`)

A reusable wrapper that gates premium content:

```typescript
interface UpgradeGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;  // What to show locked users (default: upgrade prompt)
}

// Usage:
<UpgradeGate feature="full_curriculum">
  <LessonContent lesson={lesson} />
</UpgradeGate>

// When user lacks access, shows:
// ┌─────────────────────────────────────┐
// │  🔒 Pro Feature                     │
// │  Unlock full curriculum access      │
// │  [See Plans →]                      │
// └─────────────────────────────────────┘
```

**Styling:**
- Locked content area has a blur overlay (CSS `filter: blur(4px)` on the children)
- Gold-bordered upgrade card overlaid on top
- Subtle animation on the lock icon

### 7. Reading Recommendations (`src/components/Reading/ReadingSection.tsx` + `.css`)

**Create:** `src/data/reading-recommendations.ts`

Curated book recommendations mapped to each domain:

```typescript
export interface BookRecommendation {
  title: string;
  author: string;
  domain: DomainKey;
  level: 'foundation' | 'intermediate' | 'advanced';
  description: string;          // 1-2 sentences on why this book matters for this domain
  affiliate_tag: string;        // Placeholder: "renaissance-20"
  isbn: string;                 // For constructing affiliate URLs
}
```

**Provide 3-4 real books per domain (24-32 total).** Use actual published books. Examples:
- Leadership: "Turn the Ship Around!" by L. David Marquet
- Strategy: "Good Strategy Bad Strategy" by Richard Rumelt
- Critical Thinking: "Thinking, Fast and Slow" by Daniel Kahneman
- etc.

**Affiliate URL construction:**
```typescript
function getAmazonUrl(isbn: string, tag: string): string {
  return `https://www.amazon.com/dp/${isbn}?tag=${tag}`;
}
function getBookshopUrl(isbn: string, tag: string): string {
  return `https://bookshop.org/a/${tag}/${isbn}`;
}
```

**Reading section placement:**
- Replace the "Recommended Reading" placeholder in `DashboardSection.tsx`
- Free tier: show book titles and authors only (no descriptions, no links)
- Pro tier: show full cards with descriptions + affiliate links
- Premium tier: personalized order based on assessment scores (weakest domains first)

### 8. Coaching Booking System (`src/components/Coaching/CoachingPage.tsx` + `.css`)

New route: `/coaching` (Premium only — gate with UpgradeGate)

**This is a simple scheduling UI, not a full booking backend.** Use Calendly embed or a simple form.

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  1-on-1 Renaissance Coaching                      │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Your Profile Summary                          │ │
│  │ [archetype] • Balance: [score]                │ │
│  │ Focus areas: [growth domains]                 │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Choose a Session Type:                            │
│                                                    │
│  ┌────────────────┐  ┌────────────────┐           │
│  │ Profile Review  │  │ Growth Sprint  │           │
│  │ 30 min • Free   │  │ 60 min • $95   │           │
│  │ with Premium    │  │                │           │
│  │ [Book →]        │  │ [Book →]       │           │
│  └────────────────┘  └────────────────┘           │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ What to Expect                                │ │
│  │ • Review your assessment results together     │ │
│  │ • Identify blind spots in your profile        │ │
│  │ • Set 30-day development targets              │ │
│  │ • Get personalized reading recommendations    │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**"Book" buttons:**
- Option A: Open a Calendly scheduling link in new tab (configurable via env var `VITE_CALENDLY_URL`)
- Option B: If no Calendly URL configured, show a "Request a session" form that sends data to a Supabase `coaching_requests` table:

```sql
CREATE TABLE public.coaching_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('profile_review', 'growth_sprint')),
  preferred_times TEXT,      -- Free text
  focus_areas TEXT,          -- Auto-populated from growth domains
  assessment_summary JSONB,  -- Latest assessment result snapshot
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coaching_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON public.coaching_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own requests" ON public.coaching_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 9. Integration Points

**`src/App.tsx`:**
- Wrap in `<SubscriptionProvider>`
- Add routes: `/pricing`, `/coaching`
- Pass subscription context to gated components

**`src/components/Nav/Nav.tsx`:**
- Add "Pricing" link to nav
- If user is on free tier and signed in, show subtle "Upgrade" badge

**`src/components/QuickPulse/QuickPulseOverlay.tsx` results screen:**
- Intelligence narrative: gate full version behind `full_intelligence`
- Show truncated summary for free tier with "Unlock full analysis" CTA

**`src/components/Curriculum/LessonView.tsx`:**
- Gate lessons 2+ in each course behind `full_curriculum`
- First lesson always free (preview)

**`src/components/History/HistoryPage.tsx`:**
- Gate entries beyond 2 behind `unlimited_history`
- Gate longitudinal chart behind `longitudinal_chart`

### 10. Manage Subscription UI

Add to the Profile page (`/profile`):
- Current plan display with renewal date
- "Manage Subscription" button → redirects to Stripe Customer Portal
- "Cancel Subscription" → confirms, then calls Stripe portal with cancel flow

```typescript
// Stripe Customer Portal redirect
async function openCustomerPortal(customerId: string): Promise<void> {
  // This requires a Supabase Edge Function or serverless function
  // For now, create a placeholder that shows:
  // "Contact support@renaissanceskills.com to manage your subscription"
  // with a TODO comment for the backend implementation
}
```

---

## TYPES TO ADD (`src/types/index.ts`)

```typescript
// ── Monetization Types ──

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type FeatureKey =
  | 'deep_dive' | 'full_curriculum' | 'full_intelligence'
  | 'unlimited_history' | 'longitudinal_chart' | 'shareable_card'
  | 'curated_reading' | 'personalized_reading' | 'coaching' | 'priority_support';

export interface SubscriptionState {
  tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface BookRecommendation {
  title: string;
  author: string;
  domain: DomainKey;
  level: 'foundation' | 'intermediate' | 'advanced';
  description: string;
  affiliate_tag: string;
  isbn: string;
}

export interface CoachingRequest {
  id: string;
  session_type: 'profile_review' | 'growth_sprint';
  preferred_times: string;
  focus_areas: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}
```

---

## CSS CONVENTIONS

- Pricing classes: `pricing-` prefix
- Upgrade gate classes: `gate-` prefix
- Reading classes: `reading-` prefix
- Coaching classes: `coaching-` prefix
- Tier badges: Free = muted border, Pro = gold border + fill, Premium = gold gradient
- Lock overlay: `backdrop-filter: blur(4px); background: rgba(13, 13, 13, 0.7);`
- All use design tokens, all include reduced-motion and mobile breakpoints

---

## IMPORTANT GUARDRAILS

1. **Never store payment data** — Stripe handles everything. You only store `stripe_customer_id` and `subscription_tier` in Supabase.
2. **Never hardcode Stripe price IDs** — use env vars or Stripe Pricing Table embed.
3. **Free tier must remain fully functional** — Quick Pulse, basic results, first lesson preview all work without payment.
4. **Affiliate links must be clearly disclosed** — add a small "affiliate link" disclosure near book recommendations.
5. **Gate content gracefully** — show a preview/blur, not an empty state. Users should see what they're missing.
6. **If Stripe is not configured** (no env var), treat all users as Premium for development purposes.
7. **Coaching requests must include RLS** — users can only see their own requests.
8. **Book recommendations must be real published books** — use actual ISBNs.

---

## VERIFICATION CHECKLIST

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] App works fully without Stripe configured (everything unlocked)
- [ ] Free users can complete Quick Pulse and see basic results
- [ ] Free users see first lesson in each course, locked for rest
- [ ] Pro features unlock correctly (Deep Dive, full curriculum, history)
- [ ] Premium features unlock correctly (coaching, personalized reading)
- [ ] Pricing page renders all three tiers with correct feature lists
- [ ] UpgradeGate component shows blur + CTA for locked content
- [ ] Reading recommendations show real books with affiliate links
- [ ] Coaching page shows session types and booking form
- [ ] Profile page shows current plan and management options
- [ ] Affiliate disclosure is present near reading links
- [ ] No payment data stored in Supabase — only Stripe IDs
- [ ] No `any` types
- [ ] Mobile layout works at 375px width
- [ ] `prefers-reduced-motion` respected
