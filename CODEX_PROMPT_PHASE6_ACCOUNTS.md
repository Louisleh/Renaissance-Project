# Codex Build Prompt: Phase 6 — Accounts, Persistence, and Analytics

## CRITICAL CONTEXT — READ FIRST

You are working on an existing **Vite + React + TypeScript** frontend application called Renaissance Skills. The app currently stores all data in `localStorage` (assessment results, curriculum progress). Your job is to add **user accounts, persistent storage, and analytics** so the app becomes a real platform with longitudinal tracking.

**This phase introduces a backend.** Use **Supabase** as the backend-as-a-service:
- Auth (email magic link + OAuth via Google)
- PostgreSQL database for user profiles, assessments, and progress
- Row Level Security (RLS) for data isolation
- Supabase JS client for all data operations

**You MUST NOT:**
- Change existing scoring logic in `src/lib/scoring.ts` or `src/lib/profile-intelligence.ts`
- Change existing type definitions (only extend)
- Break the app for unauthenticated users — the assessment MUST still work without signing in
- Install any backend framework (Express, Fastify, etc.) — Supabase handles everything
- Use `any` type

**You MUST:**
- Follow existing conventions (file structure, naming, CSS, component patterns)
- Keep full localStorage fallback — unauthenticated users keep current behavior
- Add Supabase sync layer that activates only when user is signed in
- Ensure `npm run build` and `npm run lint` pass with zero errors
- Match the existing dark premium visual style

---

## EXISTING PROJECT CONTEXT

### Stack
- Vite + React 19 + TypeScript 5.9
- react-router-dom v7
- Vitest for testing
- Plain CSS with design tokens (no Tailwind, no UI libraries)

### Current localStorage keys
```typescript
'renaissance_quick_pulse_result'   // AssessmentResult JSON
'renaissance_deep_dive_result'     // AssessmentResult JSON (if Phase 4 is built)
'renaissance_curriculum_progress'  // CurriculumProgress JSON (if Phase 5 is built)
```

### Design tokens
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
}
```

### Existing types you must know
```typescript
export type DomainKey =
  | 'leadership' | 'creativity' | 'strategy' | 'tech_proficiency'
  | 'problem_solving' | 'critical_thinking' | 'adaptability' | 'data_analysis';

export interface AssessmentResult {
  assessment_id: string;
  assessment_name: string;
  completed_at: string;
  response_count: number;
  responses: QuestionResponse[];
  scores: DomainScores;        // Record<DomainKey, number>
  levels: DomainLevels;        // Record<DomainKey, LevelLabel>
  top_strengths: DomainKey[];
  growth_domains: DomainKey[];
  archetype: ArchetypeResult;
  balance_index: number;
  recommended_modules: string[];
}
```

---

## WHAT TO BUILD

### 1. Supabase Setup

**Install:** `npm install @supabase/supabase-js`

**Create:** `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured — running in local-only mode');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;
```

**Create:** `.env.example`
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**IMPORTANT:** Add `.env` to `.gitignore` if not already there.

### 2. Database Schema (`supabase/migrations/001_initial_schema.sql`)

Create a `supabase/` directory at the project root with this migration:

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Assessment results (historical — never overwritten)
CREATE TABLE public.assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('quick_pulse', 'deep_dive', 'llm_mirror')),
  result JSONB NOT NULL,            -- Full AssessmentResult object
  intelligence JSONB,               -- Full ProfileIntelligence object
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assessments_user ON public.assessments(user_id, created_at DESC);

-- Curriculum progress
CREATE TABLE public.curriculum_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  progress JSONB NOT NULL,          -- Full CurriculumProgress object
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics events
CREATE TABLE public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_name ON public.analytics_events(event_name, created_at DESC);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Assessments: users can only see/insert their own
CREATE POLICY "Users can view own assessments" ON public.assessments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Curriculum: users can only see/edit their own
CREATE POLICY "Users can view own curriculum" ON public.curriculum_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own curriculum" ON public.curriculum_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own curriculum" ON public.curriculum_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Analytics: users can insert their own events, no read access
CREATE POLICY "Users can insert own events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Anonymous events (user_id = null) allowed via service role only

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Auth Context (`src/contexts/AuthContext.tsx`)

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState>(/* default values */);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Implementation:
  // - On mount, check supabase.auth.getSession()
  // - Subscribe to onAuthStateChange
  // - signInWithEmail sends magic link via supabase.auth.signInWithOtp({ email })
  // - signInWithGoogle uses supabase.auth.signInWithOAuth({ provider: 'google' })
  // - If !isSupabaseConfigured, all auth functions are no-ops and user stays null
  // - loading = true until initial session check completes
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### 4. Data Sync Layer (`src/lib/data-sync.ts`)

This is the key architectural piece. It provides a unified API that:
- Always reads/writes localStorage (immediate, offline-capable)
- If user is authenticated AND Supabase is configured, also syncs to Supabase
- On sign-in, merges localStorage data into Supabase (localStorage wins for conflicts)
- On sign-in from new device, pulls Supabase data into localStorage

```typescript
import { supabase, isSupabaseConfigured } from './supabase';
import type { AssessmentResult, ProfileIntelligence, CurriculumProgress } from '../types';

// ── Assessment Results ──

// Save assessment result (always localStorage, optionally Supabase)
export async function saveAssessmentResult(
  type: 'quick_pulse' | 'deep_dive' | 'llm_mirror',
  result: AssessmentResult,
  intelligence: ProfileIntelligence | null,
  userId: string | null
): Promise<void>;

// Load latest assessment result for a type
export function loadAssessmentResult(type: 'quick_pulse' | 'deep_dive'): AssessmentResult | null;

// Load ALL historical assessment results (Supabase only — returns [] if not authenticated)
export async function loadAssessmentHistory(userId: string): Promise<{
  type: string;
  result: AssessmentResult;
  intelligence: ProfileIntelligence | null;
  created_at: string;
}[]>;

// ── Curriculum Progress ──

export async function saveCurriculumProgress(
  progress: CurriculumProgress,
  userId: string | null
): Promise<void>;

export function loadCurriculumProgress(): CurriculumProgress | null;

// ── Sync on Sign-In ──

// Called once after user signs in — merges local data to cloud
export async function syncOnSignIn(userId: string): Promise<void>;

// ── Analytics ──

export async function trackEvent(
  eventName: string,
  eventData?: Record<string, unknown>,
  userId?: string | null
): Promise<void>;
```

**Sync logic for `syncOnSignIn`:**
1. Load all localStorage assessment results
2. Check if Supabase has any assessments for this user
3. If Supabase is empty, upload all localStorage results
4. If Supabase has data AND localStorage has data, compare `completed_at` timestamps — keep the most recent for each type, but always preserve all historical records
5. Same for curriculum progress — merge by taking the version with more completed lessons

### 5. Analytics Events (`src/lib/analytics.ts`)

Track these specific events using `trackEvent`:

| Event Name | When | Data |
|------------|------|------|
| `assessment_started` | User clicks "Start Quick Pulse" or "Start Deep Dive" | `{ type }` |
| `assessment_completed` | Assessment result computed | `{ type, archetype, balance_index }` |
| `assessment_question_answered` | Each question answered | `{ type, question_index, time_spent_ms }` |
| `curriculum_course_started` | User opens a course for first time | `{ course_id, domain }` |
| `curriculum_lesson_completed` | User marks lesson complete | `{ course_id, lesson_id, domain }` |
| `curriculum_course_completed` | All lessons in course done | `{ course_id, domain }` |
| `reassessment_triggered` | User retakes assessment after curriculum | `{ previous_assessment_id }` |
| `page_view` | Route change | `{ path }` |
| `cta_click` | Any CTA button click | `{ cta_id, location }` |
| `sign_in` | User signs in | `{ method: 'email' \| 'google' }` |
| `sign_out` | User signs out | `{}` |

**Session tracking:**
- Generate a `session_id` (UUID) on page load, store in sessionStorage
- Include it in all events for session-level analysis

### 6. Auth UI Components

**`src/components/Auth/AuthModal.tsx` + `.css`**

A modal dialog (same overlay pattern as QuickPulseOverlay) with:
- Tab toggle: "Sign in" / "Create account" (both use same magic link flow)
- Email input + "Send magic link" button
- "Or continue with Google" divider + Google button
- Success state: "Check your email for the magic link"
- Error state: inline error message
- Loading state: spinner on buttons

**`src/components/Auth/UserMenu.tsx` + `.css`**

Shown in the Nav when user is authenticated:
- User avatar circle (first letter of display name, gold background)
- Dropdown on click: "My Profile", "Assessment History", "Sign Out"
- Replace the "Get Started" CTA in Nav with UserMenu when signed in

### 7. Assessment History Page (`src/components/History/HistoryPage.tsx` + `.css`)

New route: `/history` (requires auth — redirect to home if not signed in)

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Assessment History                               │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Quick Pulse • Mar 15, 2026                    │ │
│  │ The Strategist (72% confidence)               │ │
│  │ Balance: 68 • Scores: [mini radar chart]      │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Deep Dive • Mar 12, 2026                      │ │
│  │ The Polymath (58% confidence)                 │ │
│  │ Balance: 71 • Scores: [mini radar chart]      │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Longitudinal View                              │ │
│  │ [Line chart showing domain scores over time]   │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Longitudinal chart:**
- Simple SVG line chart (no chart libraries — build it like the RadarChart)
- X-axis: assessment dates
- Y-axis: 0-100 score
- One line per domain, color-coded
- Toggle domains on/off by clicking the legend
- Overlay multiple assessment types on the same timeline

### 8. Profile Page (`src/components/Profile/ProfilePage.tsx` + `.css`)

New route: `/profile` (requires auth)

Shows:
- Display name (editable inline)
- Email (read-only)
- Member since date
- Latest archetype badge
- Current balance index
- Quick stats: assessments taken, lessons completed, courses completed
- "Delete my data" danger button (deletes Supabase data + clears localStorage)

### 9. Integration Changes

**`src/App.tsx`:**
- Wrap everything in `<AuthProvider>`
- Add routes: `/history`, `/profile`
- Pass `userId` to data-saving functions where needed

**`src/components/Nav/Nav.tsx`:**
- Show UserMenu when authenticated, "Sign In" button when not
- "Sign In" opens AuthModal

**`src/components/QuickPulse/QuickPulseOverlay.tsx`:**
- After computing result, call `saveAssessmentResult('quick_pulse', result, intel, userId)`
- Call `trackEvent('assessment_completed', ...)`

**All existing localStorage calls:**
- Route through `data-sync.ts` instead of direct `localStorage.setItem/getItem`
- This is the most delicate change — do NOT break existing behavior for unauthenticated users

---

## TYPES TO ADD (`src/types/index.ts`)

```typescript
// ── Account & Analytics Types ──

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
}

export interface AssessmentHistoryEntry {
  id: string;
  type: 'quick_pulse' | 'deep_dive' | 'llm_mirror';
  result: AssessmentResult;
  intelligence: ProfileIntelligence | null;
  created_at: string;
}

export interface AnalyticsEvent {
  event_name: string;
  event_data: Record<string, unknown>;
  session_id: string;
  created_at: string;
}
```

---

## CSS CONVENTIONS

- Auth modal classes: `auth-` prefix
- User menu classes: `user-` prefix
- History page classes: `hist-` prefix
- Profile page classes: `prof-` prefix
- All use design tokens, same panel/card patterns
- Auth modal backdrop: `background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);`
- Google button: white background, dark text (Google's branding guidelines)
- Danger button (delete data): `background: #8b2020; color: white;`
- Mini radar charts: reuse `<RadarChart>` component with smaller size

---

## IMPORTANT GUARDRAILS

1. **Never store passwords** — Supabase handles all auth. You only call `signInWithOtp` and `signInWithOAuth`.
2. **Never expose service role key** — only use the anon key in frontend code.
3. **RLS is mandatory** — every table must have policies. Users must never see other users' data.
4. **Graceful degradation** — if Supabase is not configured (env vars missing), the app must work exactly as it does today with localStorage only. No errors, no warnings in the console.
5. **No data loss on sign-in** — localStorage data from anonymous sessions must be preserved and uploaded when user creates an account.
6. **The SVG line chart must be custom** — do not install Chart.js, Recharts, or any chart library. Build it like the existing RadarChart.

---

## VERIFICATION CHECKLIST

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test` passes
- [ ] App works fully without Supabase env vars (localStorage-only mode)
- [ ] Magic link sign-in flow works (with Supabase configured)
- [ ] Google OAuth sign-in flow works
- [ ] Assessment results sync to Supabase on save
- [ ] Sign-in merges localStorage data to cloud
- [ ] Assessment history page shows all past results with timestamps
- [ ] Longitudinal chart renders domain scores over time
- [ ] Profile page shows user info and stats
- [ ] "Delete my data" clears both Supabase and localStorage
- [ ] UserMenu replaces CTA in Nav when signed in
- [ ] Analytics events fire for all specified triggers
- [ ] RLS policies prevent cross-user data access
- [ ] No `any` types
- [ ] Mobile layout works at 375px width
- [ ] `prefers-reduced-motion` respected
