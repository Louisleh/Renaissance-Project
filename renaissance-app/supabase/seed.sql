-- Local-only seed. Loaded by `supabase start` after migrations.
-- pgTAP is required by `supabase test db` (the `db-policies` CI job)
-- but is not part of the production schema, so it lives here rather
-- than in a numbered migration.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
