-- Per-user per-card FSRS state. Updated every review.
CREATE TABLE IF NOT EXISTS public.card_states (
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  card_id          TEXT NOT NULL,
  card_set_version INTEGER NOT NULL,
  domain           TEXT NOT NULL,
  due_at           TIMESTAMPTZ NOT NULL,
  stability        DOUBLE PRECISION NOT NULL DEFAULT 0,
  difficulty       DOUBLE PRECISION NOT NULL DEFAULT 0,
  elapsed_days     DOUBLE PRECISION NOT NULL DEFAULT 0,
  scheduled_days   DOUBLE PRECISION NOT NULL DEFAULT 0,
  reps             INTEGER NOT NULL DEFAULT 0,
  lapses           INTEGER NOT NULL DEFAULT 0,
  state            SMALLINT NOT NULL DEFAULT 0,
  last_review      TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_card_states_due    ON public.card_states(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_card_states_domain ON public.card_states(user_id, domain);

-- Append-only review history; drives retention + streak.
CREATE TABLE IF NOT EXISTS public.card_reviews (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  card_id         TEXT NOT NULL,
  domain          TEXT NOT NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  prev_stability  DOUBLE PRECISION,
  next_stability  DOUBLE PRECISION,
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_card_reviews_user_date ON public.card_reviews(user_id, reviewed_at DESC);

-- Daily aggregates for cheap streak + journey reads.
CREATE TABLE IF NOT EXISTS public.study_days (
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day            DATE NOT NULL,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  minutes        INTEGER NOT NULL DEFAULT 0,
  retention_pct  DOUBLE PRECISION,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  context        JSONB,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS public.commonplace_entries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  prompt_id   TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  body        TEXT NOT NULL,
  domain_hint TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commonplace_user ON public.commonplace_entries(user_id, created_at DESC);

ALTER TABLE public.card_states         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_days          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commonplace_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_states' AND policyname = 'card_states own') THEN
    CREATE POLICY "card_states own" ON public.card_states FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'card_reviews' AND policyname = 'card_reviews own') THEN
    CREATE POLICY "card_reviews own" ON public.card_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_days' AND policyname = 'study_days own') THEN
    CREATE POLICY "study_days own" ON public.study_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_achievements' AND policyname = 'achievements own') THEN
    CREATE POLICY "achievements own" ON public.user_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commonplace_entries' AND policyname = 'commonplace own') THEN
    CREATE POLICY "commonplace own" ON public.commonplace_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_study_day()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.study_days (user_id, day, cards_reviewed, minutes)
  VALUES (
    NEW.user_id,
    (NEW.reviewed_at AT TIME ZONE 'UTC')::date,
    1,
    GREATEST(NEW.duration_ms, 0) / 60000
  )
  ON CONFLICT (user_id, day) DO UPDATE
  SET cards_reviewed = study_days.cards_reviewed + 1,
      minutes = study_days.minutes + GREATEST(NEW.duration_ms, 0) / 60000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_card_review_insert ON public.card_reviews;
CREATE TRIGGER on_card_review_insert
  AFTER INSERT ON public.card_reviews
  FOR EACH ROW EXECUTE FUNCTION public.upsert_study_day();
