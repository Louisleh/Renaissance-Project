-- upsert_study_day is SECURITY DEFINER because it has to bypass RLS on
-- study_days for the write. Verify the trigger attributes rows to the
-- inserting user's user_id (not the definer), so it cannot be weaponized
-- to inflate another user's aggregates.

BEGIN;

\i tests/_helpers.sql

SELECT plan(3);

SELECT public.test_seed_pair(
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666'
);

-- User A inserts a review -> triggers upsert_study_day for user A only.
SELECT public.test_auth_as('55555555-5555-5555-5555-555555555555');

INSERT INTO public.card_reviews (user_id, card_id, domain, rating, duration_ms, reviewed_at)
VALUES ('55555555-5555-5555-5555-555555555555', 'biology:dna', 'Biology', 3, 120000, now());

-- User A sees their aggregate; user B must see nothing.
SELECT is(
  (SELECT count(*) FROM public.study_days WHERE user_id = '55555555-5555-5555-5555-555555555555')::int,
  1,
  'upsert_study_day: trigger created exactly one study_days row for user A'
);

SELECT public.test_auth_as('66666666-6666-6666-6666-666666666666');

SELECT is(
  (SELECT count(*) FROM public.study_days)::int,
  0,
  'upsert_study_day: user B cannot read the row written by user A trigger'
);

-- A second review from user A on the same day aggregates, not duplicates.
SELECT public.test_auth_as('55555555-5555-5555-5555-555555555555');

INSERT INTO public.card_reviews (user_id, card_id, domain, rating, duration_ms, reviewed_at)
VALUES ('55555555-5555-5555-5555-555555555555', 'biology:rna', 'Biology', 4, 60000, now());

SELECT is(
  (SELECT cards_reviewed FROM public.study_days
    WHERE user_id = '55555555-5555-5555-5555-555555555555' LIMIT 1),
  2,
  'upsert_study_day: second review on same day increments cards_reviewed to 2'
);

SELECT * FROM finish();
ROLLBACK;
