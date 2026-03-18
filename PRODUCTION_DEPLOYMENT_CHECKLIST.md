# Renaissance Skills — Production Deployment Checklist

## External Services, Keys & Assets Required

This document covers everything needed to take the app from its current development state to fully functional in production.

---

## 1. Supabase (Database + Auth + Edge Functions)

**Sign up:** supabase.com — create a project

### Configure:
- Run all 4 migration files in order (`supabase/migrations/001_*` through `004_*`) against your database
- Enable **Email (Magic Link)** auth provider in Authentication > Providers
- Enable **Google OAuth** provider (requires Google Cloud Console OAuth credentials — see section 4)
- Deploy edge functions:
  ```
  supabase functions deploy create-checkout-session
  supabase functions deploy create-portal-session
  ```
- Set the Stripe secret as a Supabase secret:
  ```
  supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
  ```

### Provide to app (.env):
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 2. Stripe (Payments)

**Sign up:** stripe.com — activate your account

### Configure:
- Create two **Products** with recurring prices: Pro and Premium
- Create a **Pricing Table** (Stripe Dashboard > Product catalog > Pricing tables)
- Enable the **Customer Portal** (Settings > Billing > Customer portal) — required for the portal edge function to work
- Set up a **Webhook** pointing to your Supabase project to sync subscription status back to the `profiles` table (see "Gap to Address" at the end of this document)

### Provide to app (.env):
```
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx
VITE_STRIPE_PRICING_TABLE_ID=prctbl_xxx
VITE_STRIPE_PRO_PRICE_ID=price_xxx
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Provide to Supabase (secrets):
```
STRIPE_SECRET_KEY=sk_live_xxx
```

---

## 3. PostHog (Product Analytics)

**Sign up:** posthog.com — free tier covers 1M events/month

### Configure:
Create a project and grab the API key. No other setup needed — events flow automatically from the app once the key is set.

### Provide to app (.env):
```
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

---

## 4. Google Cloud Console (OAuth for Google Sign-In)

**Sign up:** console.cloud.google.com

### Configure:
- Create OAuth 2.0 credentials (Web application type)
- Add your production URL + Supabase callback URL as authorized redirect URIs:
  - `https://yourdomain.com`
  - `https://yourproject.supabase.co/auth/v1/callback`
- Copy **Client ID** and **Client Secret** into Supabase Dashboard > Auth > Providers > Google

---

## 5. Calendly (Coaching Sessions)

**Sign up:** calendly.com

### Configure:
Create a "Renaissance Session" event type.

### Provide to app (.env):
```
VITE_CALENDLY_URL=https://calendly.com/your-handle/renaissance-session
```

---

## 6. Hosting / Deploy

**Recommended:** Vercel or Netlify (both have free tiers for Vite/React apps)

### Configure:
- Connect your GitHub repo
- Set build command: `cd renaissance-app && npm run build`
- Set output directory: `renaissance-app/dist`
- Add **all** `VITE_*` environment variables listed above in the hosting dashboard
- Set up a custom domain if desired

---

## 7. Brand Assets (Content)

Drop images into the directory structure already set up in the codebase:

| Directory                | What's Needed                 | Recommended Size   |
|--------------------------|-------------------------------|--------------------|
| `public/images/hero/`    | Hero section background       | 1920×1080, WebP    |
| `public/images/team/`    | About section team photos     | 400×400, WebP      |
| `public/images/brand/`   | Logo, favicon, OG share image | OG: 1200×630       |

Use the `<OptimizedImage>` component (already built) to render them with lazy loading and layout-shift prevention.

---

## Complete .env Template

```env
# Supabase
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx
VITE_STRIPE_PRICING_TABLE_ID=prctbl_xxx
VITE_STRIPE_PRO_PRICE_ID=price_xxx
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxx

# Calendly
VITE_CALENDLY_URL=https://calendly.com/your-handle/renaissance-session

# PostHog (optional)
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

### Supabase-side secrets (not in .env):
```
STRIPE_SECRET_KEY=sk_live_xxx
```

---

## One Gap to Address

**Stripe Webhook Handler** — The edge functions handle *creating* checkout and portal sessions, but there is no webhook listener yet to update the `profiles` table when a subscription is created, cancelled, or updated by Stripe. You will need either:

1. A `stripe-webhook` Supabase edge function that verifies webhook signatures and updates `profiles.subscription_tier`, `stripe_customer_id`, and `stripe_subscription_id`, OR
2. Stripe's official Supabase integration (available in Stripe Dashboard > Integrations), which syncs subscription data automatically.

Without this, users can check out successfully but their subscription tier won't be reflected in the app until the webhook pipeline is in place.

---

*Generated from Renaissance Skills codebase — branch `claude/review-handoff-planning-6Vjcz`*
*Date: March 18, 2026*
