-- Shared helpers for pgTAP RLS specs.
-- Usage: \i tests/_helpers.sql (loaded at the top of each spec).
-- Path is relative to <project>/supabase/, which is the cwd
-- `supabase test db` runs pg_prove from.

-- Swap to the `authenticated` role and set the JWT `sub` claim so
-- auth.uid() resolves to the given uuid inside the current transaction.
CREATE OR REPLACE FUNCTION public.test_auth_as(user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

-- Reset to the superuser/anon role so setup statements bypass RLS.
CREATE OR REPLACE FUNCTION public.test_auth_reset()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
  EXECUTE 'RESET ROLE';
END;
$$;

-- Seed two auth users + auto-created profiles via handle_new_user.
CREATE OR REPLACE FUNCTION public.test_seed_pair(
  user_a uuid,
  user_b uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  )
  VALUES
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'a-' || user_a || '@test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'b-' || user_b || '@test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id) VALUES (user_a), (user_b)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
