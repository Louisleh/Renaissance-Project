-- Migration 003 created coaching_requests with only SELECT + INSERT
-- own policies, leaving UPDATE and DELETE silently denied. Migration 006
-- adds the missing policies. This spec fails against 003 alone and
-- turns green once 006 is applied.

BEGIN;

\i tests/_helpers.sql

SELECT plan(5);

SELECT public.test_seed_pair(
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- User A creates a coaching request.
SELECT public.test_auth_as('33333333-3333-3333-3333-333333333333');

INSERT INTO public.coaching_requests (user_id, session_type, preferred_times, focus_areas)
VALUES ('33333333-3333-3333-3333-333333333333', 'profile_review', 'mornings', 'leadership');

-- User A updates and deletes their own request (requires migration 006).
UPDATE public.coaching_requests
  SET preferred_times = 'evenings'
  WHERE user_id = '33333333-3333-3333-3333-333333333333';

SELECT is(
  (SELECT preferred_times FROM public.coaching_requests LIMIT 1),
  'evenings',
  'coaching_requests: user A can update their own row after migration 006'
);

-- User B cannot read, update, or delete user A's rows.
SELECT public.test_auth_as('44444444-4444-4444-4444-444444444444');

SELECT is(
  (SELECT count(*) FROM public.coaching_requests)::int,
  0,
  'coaching_requests: user B cannot read user A rows'
);

-- Silent denials: updates and deletes that violate USING affect zero rows.
SELECT is(
  (WITH upd AS (
    UPDATE public.coaching_requests
      SET preferred_times = 'anytime'
      WHERE user_id = '33333333-3333-3333-3333-333333333333'
      RETURNING 1
  ) SELECT count(*)::int FROM upd),
  0,
  'coaching_requests: user B UPDATE of user A rows affects 0 rows'
);

SELECT is(
  (WITH del AS (
    DELETE FROM public.coaching_requests
      WHERE user_id = '33333333-3333-3333-3333-333333333333'
      RETURNING 1
  ) SELECT count(*)::int FROM del),
  0,
  'coaching_requests: user B DELETE of user A rows affects 0 rows'
);

-- User A can still delete their own row.
SELECT public.test_auth_as('33333333-3333-3333-3333-333333333333');
DELETE FROM public.coaching_requests
  WHERE user_id = '33333333-3333-3333-3333-333333333333';

SELECT is(
  (SELECT count(*) FROM public.coaching_requests)::int,
  0,
  'coaching_requests: user A can delete their own row after migration 006'
);

SELECT * FROM finish();
ROLLBACK;
