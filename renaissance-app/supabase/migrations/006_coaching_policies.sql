-- Backfill the missing UPDATE and DELETE policies on coaching_requests.
-- Migration 003 only added SELECT + INSERT policies; once RLS is on, any
-- table without matching UPDATE/DELETE policies silently denies those
-- operations, which meant users could not modify or cancel a request they
-- had already created.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coaching_requests'
      AND policyname = 'Users can update own coaching requests'
  ) THEN
    CREATE POLICY "Users can update own coaching requests"
      ON public.coaching_requests
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coaching_requests'
      AND policyname = 'Users can delete own coaching requests'
  ) THEN
    CREATE POLICY "Users can delete own coaching requests"
      ON public.coaching_requests
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
