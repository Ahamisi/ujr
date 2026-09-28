-- Applied after drizzle migrations, as the postgres superuser.
-- The application connects as ujer_app, which is not a superuser and cannot
-- bypass these policies. journals, users, sessions, accounts and
-- verifications stay open enough for login and for resolving a journal slug
-- before the tenant is known.

CREATE OR REPLACE FUNCTION app_journal_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.journal_id', true), '')::uuid
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'annotations',
    'audit_log',
    'decisions',
    'doi_counters',
    'doi_deposits',
    'files',
    'issues',
    'manuscript_authors',
    'manuscript_versions',
    'manuscripts',
    'notifications',
    'production_tasks',
    'reference_counters',
    'review_forms',
    'reviews',
    'sections',
    'settings_history',
    'status_transitions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (journal_id = app_journal_id()) WITH CHECK (journal_id = app_journal_id())',
      t
    );
  END LOOP;
END $$;

ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assignment_by_token ON review_assignments;
CREATE POLICY assignment_by_token ON review_assignments
  USING (
    journal_id = app_journal_id()
    OR access_token_hash = NULLIF(current_setting('app.review_token_hash', true), '')
  )
  WITH CHECK (journal_id = app_journal_id());

ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS charge_by_reference ON charges;
CREATE POLICY charge_by_reference ON charges
  USING (
    journal_id = app_journal_id()
    OR paystack_reference = NULLIF(current_setting('app.paystack_reference', true), '')
  )
  WITH CHECK (journal_id = app_journal_id());

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_memberships ON memberships;
CREATE POLICY own_memberships ON memberships
  USING (
    journal_id = app_journal_id()
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR (
      journal_id IS NULL
      AND role = 'platform_admin'
      AND user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    )
  )
  WITH CHECK (
    journal_id = app_journal_id()
    OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

-- Reminder sweeps are not tied to one journal. The tick inserts those rows.
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jobs_tenant ON jobs;
CREATE POLICY jobs_tenant ON jobs
  USING (journal_id IS NULL OR journal_id = app_journal_id())
  WITH CHECK (journal_id IS NULL OR journal_id = app_journal_id());

ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS journals_read ON journals;
DROP POLICY IF EXISTS journals_insert ON journals;
DROP POLICY IF EXISTS journals_update ON journals;
CREATE POLICY journals_read ON journals FOR SELECT USING (true);
CREATE POLICY journals_insert ON journals FOR INSERT WITH CHECK (true);
CREATE POLICY journals_update ON journals FOR UPDATE
  USING (id = app_journal_id())
  WITH CHECK (id = app_journal_id());
DROP POLICY IF EXISTS journals_delete ON journals;
CREATE POLICY journals_delete ON journals FOR DELETE
  USING (id = app_journal_id());

ALTER TABLE review_form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_form_questions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS questions_follow_form ON review_form_questions;
CREATE POLICY questions_follow_form ON review_form_questions
  USING (
    EXISTS (
      SELECT 1 FROM review_forms f
      WHERE f.id = review_form_questions.form_id
        AND f.journal_id = app_journal_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_forms f
      WHERE f.id = review_form_questions.form_id
        AND f.journal_id = app_journal_id()
    )
  );

GRANT USAGE ON SCHEMA public TO ujer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ujer_app;
-- institutions is created after the first migration. ALL TABLES does not
-- cover tables added later, and this catalogue has no row-level security.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'institutions'
  ) THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE institutions TO ujer_app;
  END IF;
END $$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ujer_app;
GRANT EXECUTE ON FUNCTION app_journal_id() TO ujer_app;
