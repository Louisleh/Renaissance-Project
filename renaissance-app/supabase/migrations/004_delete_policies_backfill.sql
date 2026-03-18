DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can delete own profile'
  ) THEN
    CREATE POLICY "Users can delete own profile" ON public.profiles
      FOR DELETE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'assessments'
      AND policyname = 'Users can delete own assessments'
  ) THEN
    CREATE POLICY "Users can delete own assessments" ON public.assessments
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_progress'
      AND policyname = 'Users can delete own curriculum'
  ) THEN
    CREATE POLICY "Users can delete own curriculum" ON public.curriculum_progress
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_events'
      AND policyname = 'Users can delete own events'
  ) THEN
    CREATE POLICY "Users can delete own events" ON public.analytics_events
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
