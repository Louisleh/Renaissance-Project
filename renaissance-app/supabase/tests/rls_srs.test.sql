-- Confirms migration 005's "FOR ALL … USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id)" policies isolate users across every
-- SRS table.

BEGIN;

\i tests/_helpers.sql

SELECT plan(10);

-- Seed two users (uuids chosen for readability in failure output).
SELECT public.test_seed_pair(
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- User A writes a row into every SRS-owned table.
SELECT public.test_auth_as('11111111-1111-1111-1111-111111111111');

INSERT INTO public.card_states (user_id, card_id, card_set_version, domain, due_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'biology:dna', 1, 'Biology', now());

INSERT INTO public.card_reviews (user_id, card_id, domain, rating, duration_ms, reviewed_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'biology:dna', 'Biology', 3, 1200, now());

INSERT INTO public.user_achievements (user_id, achievement_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'first_review');

INSERT INTO public.commonplace_entries (user_id, prompt_id, prompt_text, body)
VALUES ('11111111-1111-1111-1111-111111111111', 'p1', 'prompt', 'body');

-- Switch to user B and verify complete isolation.
SELECT public.test_auth_as('22222222-2222-2222-2222-222222222222');

SELECT is((SELECT count(*) FROM public.card_states)::int, 0,
  'card_states: user B cannot read user A rows');
SELECT is((SELECT count(*) FROM public.card_reviews)::int, 0,
  'card_reviews: user B cannot read user A rows');
SELECT is((SELECT count(*) FROM public.study_days)::int, 0,
  'study_days: user B cannot read rows produced by the upsert_study_day trigger on A');
SELECT is((SELECT count(*) FROM public.user_achievements)::int, 0,
  'user_achievements: user B cannot read user A rows');
SELECT is((SELECT count(*) FROM public.commonplace_entries)::int, 0,
  'commonplace_entries: user B cannot read user A rows');

-- Cross-user writes must be rejected by the WITH CHECK clause.
SELECT throws_ok(
  $$INSERT INTO public.card_states (user_id, card_id, card_set_version, domain, due_at)
    VALUES ('11111111-1111-1111-1111-111111111111', 'physics:force', 1, 'Physics', now())$$,
  '42501',
  NULL,
  'card_states: user B cannot insert rows owned by user A');

SELECT throws_ok(
  $$INSERT INTO public.card_reviews (user_id, card_id, domain, rating, duration_ms, reviewed_at)
    VALUES ('11111111-1111-1111-1111-111111111111', 'physics:force', 'Physics', 3, 100, now())$$,
  '42501',
  NULL,
  'card_reviews: user B cannot append to user A log');

SELECT throws_ok(
  $$INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 'spoof')$$,
  '42501',
  NULL,
  'user_achievements: user B cannot unlock for user A');

SELECT throws_ok(
  $$INSERT INTO public.commonplace_entries (user_id, prompt_id, prompt_text, body)
    VALUES ('11111111-1111-1111-1111-111111111111', 'p2', 'p', 'b')$$,
  '42501',
  NULL,
  'commonplace_entries: user B cannot write as user A');

-- User A deleting their own data still works (round-trip sanity check).
SELECT public.test_auth_as('11111111-1111-1111-1111-111111111111');
DELETE FROM public.card_states WHERE card_id = 'biology:dna';
SELECT is((SELECT count(*) FROM public.card_states)::int, 0,
  'card_states: user A can delete their own row');

SELECT * FROM finish();
ROLLBACK;
