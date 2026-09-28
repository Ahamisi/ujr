CREATE TYPE "public"."answer_visibility" AS ENUM('author_and_editor', 'editor_only');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('invited', 'accepted', 'declined', 'expired', 'submitted', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."charge_status" AS ENUM('pending', 'paid', 'waived', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."decision" AS ENUM('accept', 'minor_revision', 'major_revision', 'reject', 'reject_with_resubmission', 'desk_reject');--> statement-breakpoint
CREATE TYPE "public"."doi_deposit_state" AS ENUM('minted', 'queued', 'submitted', 'registered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('manuscript', 'manuscript_anonymised', 'review_pdf', 'figure', 'supplementary', 'cover_letter', 'response_to_reviewers', 'similarity_report', 'galley_pdf', 'galley_xml', 'reviewer_attachment');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('planning', 'open', 'published');--> statement-breakpoint
CREATE TYPE "public"."manuscript_status" AS ENUM('draft', 'submitted', 'desk_review', 'desk_rejected', 'rejected', 'reviewer_search', 'under_review', 'decision_pending', 'revision_requested', 'resubmitted', 'accepted', 'in_production', 'published', 'corrected', 'retracted', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."production_stage" AS ENUM('copyediting', 'typesetting', 'proofing', 'ready');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('scale', 'single_choice', 'multi_choice', 'short_text', 'long_text', 'file');--> statement-breakpoint
CREATE TYPE "public"."recommendation" AS ENUM('accept', 'minor_revision', 'major_revision', 'reject');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('reader', 'author', 'reviewer', 'handling_editor', 'section_editor', 'editor_in_chief', 'managing_editor', 'guest_editor', 'copyeditor', 'typesetter', 'proofreader', 'integrity_officer', 'journal_manager', 'finance_officer', 'platform_admin');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"page_number" integer NOT NULL,
	"anchor" jsonb NOT NULL,
	"body" text NOT NULL,
	"visibility" "answer_visibility" DEFAULT 'author_and_editor' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid,
	"actor_id" uuid,
	"impersonated_by_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" charge_status DEFAULT 'pending' NOT NULL,
	"channel" varchar(32),
	"waived_by_id" uuid,
	"waiver_reason" text,
	"paystack_reference" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"decision" "decision" NOT NULL,
	"editor_id" uuid NOT NULL,
	"letter_body" text NOT NULL,
	"is_appeal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doi_counters" (
	"journal_id" uuid PRIMARY KEY NOT NULL,
	"next_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doi_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"doi" text NOT NULL,
	"state" "doi_deposit_state" NOT NULL,
	"submission_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid,
	"version_id" uuid,
	"kind" "file_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"is_metadata_scrubbed" boolean DEFAULT false NOT NULL,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"volume" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text,
	"status" "issue_status" DEFAULT 'planning' NOT NULL,
	"target_date" date,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid,
	"type" varchar(48) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(63) NOT NULL,
	"name" text NOT NULL,
	"abbreviation" varchar(32),
	"issn_print" varchar(9),
	"issn_electronic" varchar(9),
	"doi_prefix" varchar(32),
	"custom_domain" text,
	"policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"policy_version" integer DEFAULT 1 NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscript_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"user_id" uuid,
	"sort_order" integer NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"email" text NOT NULL,
	"affiliation" text,
	"orcid" varchar(19),
	"is_corresponding" boolean DEFAULT false NOT NULL,
	"contributions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "manuscript_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"round" integer NOT NULL,
	"response_to_reviewers" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"section_id" uuid,
	"reference" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"abstract" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "manuscript_status" DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"submitted_by_id" uuid NOT NULL,
	"handling_editor_id" uuid,
	"issue_id" uuid,
	"first_page" integer,
	"last_page" integer,
	"policy_snapshot" jsonb,
	"declarations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"similarity_percent" integer,
	"doi" text,
	"submitted_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"scope_type" varchar(16) DEFAULT 'journal' NOT NULL,
	"scope_id" uuid,
	"granted_by" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"stage" "production_stage" DEFAULT 'copyediting' NOT NULL,
	"assignee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_counters" (
	"journal_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"next_number" integer NOT NULL,
	CONSTRAINT "reference_counters_journal_id_year_pk" PRIMARY KEY("journal_id","year")
);
--> statement-breakpoint
CREATE TABLE "review_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"status" "assignment_status" DEFAULT 'invited' NOT NULL,
	"access_token_hash" varchar(64) NOT NULL,
	"invited_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"due_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"decline_reason" text,
	"reminders_sent" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_form_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"type" "question_type" NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"visibility" "answer_visibility" DEFAULT 'author_and_editor' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"include_in_summary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"instructions" text,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"recommendation" "recommendation",
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"abbreviation" varchar(16),
	"is_peer_reviewed" boolean DEFAULT true NOT NULL,
	"accepts_submissions" boolean DEFAULT true NOT NULL,
	"word_limit" integer,
	"policy_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active_review_form_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"policy_version" integer NOT NULL,
	"changes" jsonb NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"from_status" "manuscript_status",
	"to_status" "manuscript_status" NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp with time zone,
	"image" text,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"orcid" varchar(19),
	"affiliation" text,
	"country" varchar(2),
	"expertise" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shared_reviewer_pool" boolean DEFAULT false NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_impersonated_by_id_users_id_fk" FOREIGN KEY ("impersonated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charges" ADD CONSTRAINT "charges_waived_by_id_users_id_fk" FOREIGN KEY ("waived_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doi_counters" ADD CONSTRAINT "doi_counters_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doi_deposits" ADD CONSTRAINT "doi_deposits_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doi_deposits" ADD CONSTRAINT "doi_deposits_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_version_id_manuscript_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."manuscript_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_authors" ADD CONSTRAINT "manuscript_authors_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_authors" ADD CONSTRAINT "manuscript_authors_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_authors" ADD CONSTRAINT "manuscript_authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_versions" ADD CONSTRAINT "manuscript_versions_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_versions" ADD CONSTRAINT "manuscript_versions_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_handling_editor_id_users_id_fk" FOREIGN KEY ("handling_editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_counters" ADD CONSTRAINT "reference_counters_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_form_questions" ADD CONSTRAINT "review_form_questions_form_id_review_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."review_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_forms" ADD CONSTRAINT "review_forms_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_forms" ADD CONSTRAINT "review_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_assignment_id_review_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."review_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_form_id_review_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."review_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings_history" ADD CONSTRAINT "settings_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_transitions" ADD CONSTRAINT "status_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_uq" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "annotations_file_idx" ON "annotations" USING btree ("file_id","page_number");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_journal_idx" ON "audit_log" USING btree ("journal_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "charges_manuscript_uq" ON "charges" USING btree ("manuscript_id");--> statement-breakpoint
CREATE INDEX "decisions_manuscript_idx" ON "decisions" USING btree ("manuscript_id","round");--> statement-breakpoint
CREATE INDEX "doi_deposits_manuscript_idx" ON "doi_deposits" USING btree ("manuscript_id","created_at");--> statement-breakpoint
CREATE INDEX "files_manuscript_idx" ON "files" USING btree ("manuscript_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_volume_uq" ON "issues" USING btree ("journal_id","volume","number");--> statement-breakpoint
CREATE INDEX "issues_journal_idx" ON "issues" USING btree ("journal_id","status");--> statement-breakpoint
CREATE INDEX "jobs_due_idx" ON "jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "journals_slug_uq" ON "journals" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "journals_domain_uq" ON "journals" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "ms_authors_idx" ON "manuscript_authors" USING btree ("manuscript_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "ms_versions_uq" ON "manuscript_versions" USING btree ("manuscript_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "manuscripts_reference_uq" ON "manuscripts" USING btree ("journal_id","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "manuscripts_doi_uq" ON "manuscripts" USING btree ("doi");--> statement-breakpoint
CREATE INDEX "manuscripts_queue_idx" ON "manuscripts" USING btree ("journal_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "manuscripts_editor_idx" ON "manuscripts" USING btree ("handling_editor_id","status");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_journal_role_idx" ON "memberships" USING btree ("journal_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_uq" ON "memberships" USING btree ("journal_id","user_id","role","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "production_manuscript_uq" ON "production_tasks" USING btree ("manuscript_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_uq" ON "review_assignments" USING btree ("manuscript_id","reviewer_id","round");--> statement-breakpoint
CREATE INDEX "assignments_overdue_idx" ON "review_assignments" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "assignments_reviewer_idx" ON "review_assignments" USING btree ("reviewer_id","status");--> statement-breakpoint
CREATE INDEX "rfq_form_idx" ON "review_form_questions" USING btree ("form_id","sort_order");--> statement-breakpoint
CREATE INDEX "review_forms_journal_idx" ON "review_forms" USING btree ("journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_forms_version_uq" ON "review_forms" USING btree ("family_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_assignment_uq" ON "reviews" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "sections_journal_idx" ON "sections" USING btree ("journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settings_history_idx" ON "settings_history" USING btree ("journal_id","created_at");--> statement-breakpoint
CREATE INDEX "transitions_manuscript_idx" ON "status_transitions" USING btree ("manuscript_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_orcid_uq" ON "users" USING btree ("orcid");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");