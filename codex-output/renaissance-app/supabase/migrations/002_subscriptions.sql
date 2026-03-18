ALTER TABLE public.profiles
  ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_period_end TIMESTAMPTZ,
  ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX idx_profiles_stripe ON public.profiles(stripe_customer_id);
