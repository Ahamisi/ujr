/**
 * UNILAG Engineering Journal Platform — database schema (Drizzle / PostgreSQL).
 *
 * Three rules this schema is built around:
 *   1. Every tenant-owned row carries journal_id, and RLS enforces it. No exceptions.
 *   2. Editorial policy is frozen onto the manuscript at submission (policy_snapshot).
 *   3. Nothing is deleted. State changes and settings changes are append-only rows.
 */

import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { FrozenPolicy, JournalPolicyPatch } from './policy'

const now = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const touched = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/* ================================================================== *
 * ENUMS
 * ================================================================== */

export const manuscriptStatus = pgEnum('manuscript_status', [
  'draft',
  'submitted',
  'desk_review',
  'desk_rejected',
  'reviewer_search',
  'under_review',
  'decision_pending',
  'revision_requested',
  'resubmitted',
  'accepted',
  'in_production',
  'published',
  'corrected',
  'retracted',
  'withdrawn',
])

export const roleEnum = pgEnum('role', [
  'reader',
  'author',
  'reviewer',
  'handling_editor',
  'section_editor',
  'editor_in_chief',
  'managing_editor',
  'guest_editor',
  'copyeditor',
  'typesetter',
  'proofreader',
  'integrity_officer',
  'journal_manager',
  'finance_officer',
  'platform_admin',
])

export const assignmentStatus = pgEnum('assignment_status', [
  'invited',
  'accepted',
  'declined',
  'expired',
  'submitted',
  'withdrawn',
])

export const recommendation = pgEnum('recommendation', [
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
])

export const decisionEnum = pgEnum('decision', [
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
  'reject_with_resubmission',
  'desk_reject',
])

export const fileKind = pgEnum('file_kind', [
  'manuscript',
  'manuscript_anonymised', // generated, metadata-scrubbed, what reviewers receive
  'review_pdf', // canonical paginated copy for annotation
  'figure',
  'supplementary',
  'cover_letter',
  'response_to_reviewers',
  'similarity_report',
  'galley_pdf',
  'galley_xml',
  'reviewer_attachment',
])

export const questionType = pgEnum('question_type', [
  'scale', // scored criterion
  'single_choice',
  'multi_choice',
  'short_text',
  'long_text',
  'file',
])

/** Who may read an answer. The single most consequential flag in the form builder. */
export const answerVisibility = pgEnum('answer_visibility', [
  'author_and_editor',
  'editor_only',
])

/* ================================================================== *
 * TENANCY
 * ================================================================== */

export const journals = pgTable(
  'journals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 63 }).notNull(),
    name: text('name').notNull(),
    abbreviation: varchar('abbreviation', { length: 32 }),
    issnPrint: varchar('issn_print', { length: 9 }),
    issnElectronic: varchar('issn_electronic', { length: 9 }),
    doiPrefix: varchar('doi_prefix', { length: 32 }),
    customDomain: text('custom_domain'),

    /** Partial override of PLATFORM_DEFAULTS. Bumped version on every save. */
    policy: jsonb('policy').$type<JournalPolicyPatch>().notNull().default(sql`'{}'::jsonb`),
    policyVersion: integer('policy_version').notNull().default(1),

    /** Brand tokens consumed by the theming layer: colours, logo URLs, fonts. */
    branding: jsonb('branding').$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: now(),
    updatedAt: touched(),
  },
  (t) => [
    uniqueIndex('journals_slug_uq').on(t.slug),
    uniqueIndex('journals_domain_uq').on(t.customDomain),
  ],
)

export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    name: text('name').notNull(),
    abbreviation: varchar('abbreviation', { length: 16 }),
    /** Editorials and book reviews are not peer reviewed. Model that here. */
    isPeerReviewed: boolean('is_peer_reviewed').notNull().default(true),
    acceptsSubmissions: boolean('accepts_submissions').notNull().default(true),
    wordLimit: integer('word_limit'),
    /** Deep-partial override of the journal policy. */
    policyOverrides: jsonb('policy_overrides')
      .$type<JournalPolicyPatch>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    activeReviewFormId: uuid('active_review_form_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: now(),
    updatedAt: touched(),
  },
  (t) => [index('sections_journal_idx').on(t.journalId)],
)

/* ================================================================== *
 * PEOPLE AND ACCESS
 * ================================================================== */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    givenName: text('given_name').notNull(),
    familyName: text('family_name').notNull(),
    orcid: varchar('orcid', { length: 19 }),
    affiliation: text('affiliation'),
    country: varchar('country', { length: 2 }),
    /** Free-tagged expertise, used for reviewer matching across tenants. */
    expertise: jsonb('expertise').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Opt-in to being invited by other journals on the platform. */
    sharedReviewerPool: boolean('shared_reviewer_pool').notNull().default(false),
    isSuspended: boolean('is_suspended').notNull().default(false),
    createdAt: now(),
    updatedAt: touched(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email), uniqueIndex('users_orcid_uq').on(t.orcid)],
)

/**
 * A user's role within one journal. Guest editors and section editors are scoped
 * further by scope_type/scope_id — the case most permission models get wrong.
 */
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').references(() => journals.id), // null = platform-wide
    userId: uuid('user_id').notNull().references(() => users.id),
    role: roleEnum('role').notNull(),
    /** 'journal' | 'section' | 'issue' — how far this grant reaches. */
    scopeType: varchar('scope_type', { length: 16 }).notNull().default('journal'),
    scopeId: uuid('scope_id'),
    grantedBy: uuid('granted_by').references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: now(),
  },
  (t) => [
    index('memberships_user_idx').on(t.userId),
    index('memberships_journal_role_idx').on(t.journalId, t.role),
    uniqueIndex('memberships_uq').on(t.journalId, t.userId, t.role, t.scopeType, t.scopeId),
  ],
)

/* ================================================================== *
 * REVIEW FORMS — versioned, because editing a live form silently
 * invalidates every comparison across the journal's history.
 * ================================================================== */

export const reviewForms = pgTable(
  'review_forms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    /** Stable across versions; (family_id, version) is the human identity. */
    familyId: uuid('family_id').notNull(),
    version: integer('version').notNull().default(1),
    name: text('name').notNull(),
    instructions: text('instructions'),
    /** draft | published | retired. Published forms are immutable. */
    status: varchar('status', { length: 16 }).notNull().default('draft'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: now(),
  },
  (t) => [
    index('review_forms_journal_idx').on(t.journalId),
    uniqueIndex('review_forms_version_uq').on(t.familyId, t.version),
  ],
)

export const reviewFormQuestions = pgTable(
  'review_form_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formId: uuid('form_id').notNull().references(() => reviewForms.id),
    sortOrder: integer('sort_order').notNull(),
    type: questionType('type').notNull(),
    label: text('label').notNull(),
    helpText: text('help_text'),
    isRequired: boolean('is_required').notNull().default(false),
    visibility: answerVisibility('visibility').notNull().default('author_and_editor'),
    /** Choice options, or {min,max,labels} for a scale. */
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    /** Scale answers feed the editor's comparison view. */
    includeInSummary: boolean('include_in_summary').notNull().default(false),
    createdAt: now(),
  },
  (t) => [index('rfq_form_idx').on(t.formId, t.sortOrder)],
)

/* ================================================================== *
 * MANUSCRIPTS
 * ================================================================== */

export const manuscripts = pgTable(
  'manuscripts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    sectionId: uuid('section_id').references(() => sections.id),

    /** Human reference shown in every email: UJENG-2026-0147 */
    reference: varchar('reference', { length: 32 }).notNull(),

    title: text('title').notNull(),
    abstract: text('abstract'),
    keywords: jsonb('keywords').$type<string[]>().notNull().default(sql`'[]'::jsonb`),

    status: manuscriptStatus('status').notNull().default('draft'),
    currentVersion: integer('current_version').notNull().default(1),
    currentRound: integer('current_round').notNull().default(0),

    submittedById: uuid('submitted_by_id').notNull().references(() => users.id),
    handlingEditorId: uuid('handling_editor_id').references(() => users.id),

    /**
     * THE IMPORTANT COLUMN. Written once, on draft -> submitted, by freezePolicy().
     * The entire workflow reads this, never journals.policy. Flipping a journal
     * setting must never retroactively unmask reviewers or rebill an author.
     */
    policySnapshot: jsonb('policy_snapshot').$type<FrozenPolicy>(),

    /** Declarations the author affirmed, keyed by declaration id. */
    declarations: jsonb('declarations')
      .$type<Record<string, { affirmed: boolean; detail?: string }>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    similarityPercent: integer('similarity_percent'),

    doi: text('doi'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: now(),
    updatedAt: touched(),
  },
  (t) => [
    uniqueIndex('manuscripts_reference_uq').on(t.journalId, t.reference),
    uniqueIndex('manuscripts_doi_uq').on(t.doi),
    index('manuscripts_queue_idx').on(t.journalId, t.status, t.updatedAt),
    index('manuscripts_editor_idx').on(t.handlingEditorId, t.status),
  ],
)

/** Ordered author list. Not every author is a platform user yet. */
export const manuscriptAuthors = pgTable(
  'manuscript_authors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    userId: uuid('user_id').references(() => users.id),
    sortOrder: integer('sort_order').notNull(),
    givenName: text('given_name').notNull(),
    familyName: text('family_name').notNull(),
    email: text('email').notNull(),
    affiliation: text('affiliation'),
    orcid: varchar('orcid', { length: 19 }),
    isCorresponding: boolean('is_corresponding').notNull().default(false),
    /** CRediT taxonomy terms. */
    contributions: jsonb('contributions').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  },
  (t) => [index('ms_authors_idx').on(t.manuscriptId, t.sortOrder)],
)

export const manuscriptVersions = pgTable(
  'manuscript_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    version: integer('version').notNull(),
    round: integer('round').notNull(),
    /** Point-by-point response, threaded against review comments. */
    responseToReviewers: text('response_to_reviewers'),
    createdAt: now(),
  },
  (t) => [uniqueIndex('ms_versions_uq').on(t.manuscriptId, t.version)],
)

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').references(() => manuscripts.id),
    versionId: uuid('version_id').references(() => manuscriptVersions.id),
    kind: fileKind('kind').notNull(),
    storageKey: text('storage_key').notNull(), // R2 object key
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
    /**
     * True once document metadata has been scrubbed: docProps/core.xml,
     * track-changes attribution, comment authorship, PDF XMP. Reviewers are
     * never served a file where this is false.
     */
    isMetadataScrubbed: boolean('is_metadata_scrubbed').notNull().default(false),
    uploadedById: uuid('uploaded_by_id').references(() => users.id),
    createdAt: now(),
  },
  (t) => [index('files_manuscript_idx').on(t.manuscriptId, t.kind)],
)

/* ================================================================== *
 * REVIEW
 * ================================================================== */

export const reviewAssignments = pgTable(
  'review_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
    round: integer('round').notNull(),
    status: assignmentStatus('status').notNull().default('invited'),

    /** Signed token: the reviewer opens the manuscript without an account. */
    accessTokenHash: varchar('access_token_hash', { length: 64 }).notNull(),

    invitedById: uuid('invited_by_id').references(() => users.id),
    invitedAt: now(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    declineReason: text('decline_reason'),
    remindersSent: integer('reminders_sent').notNull().default(0),
  },
  (t) => [
    uniqueIndex('assignments_uq').on(t.manuscriptId, t.reviewerId, t.round),
    index('assignments_overdue_idx').on(t.status, t.dueAt),
    index('assignments_reviewer_idx').on(t.reviewerId, t.status),
  ],
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    assignmentId: uuid('assignment_id').notNull().references(() => reviewAssignments.id),
    /** Bound to the exact form version frozen onto the manuscript. */
    formId: uuid('form_id').notNull().references(() => reviewForms.id),
    recommendation: recommendation('recommendation'),
    /** Answers keyed by review_form_questions.id. Visibility lives on the question. */
    answers: jsonb('answers').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    /** Set when the reviewer's client flushes an offline draft. */
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: now(),
    updatedAt: touched(),
  },
  (t) => [uniqueIndex('reviews_assignment_uq').on(t.assignmentId)],
)

/**
 * Inline annotations, stored as rows rather than burned into the PDF — so they
 * are queryable, diffable across rounds, and can be pulled into a decision letter.
 */
export const annotations = pgTable(
  'annotations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    fileId: uuid('file_id').notNull().references(() => files.id),
    authorId: uuid('author_id').notNull().references(() => users.id),
    round: integer('round').notNull(),
    pageNumber: integer('page_number').notNull(),
    /** {x, y, width, height} normalised 0–1, plus optional quoted text. */
    anchor: jsonb('anchor').$type<Record<string, unknown>>().notNull(),
    body: text('body').notNull(),
    visibility: answerVisibility('visibility').notNull().default('author_and_editor'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: now(),
  },
  (t) => [index('annotations_file_idx').on(t.fileId, t.pageNumber)],
)

export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    round: integer('round').notNull(),
    decision: decisionEnum('decision').notNull(),
    editorId: uuid('editor_id').notNull().references(() => users.id),
    /** The letter as actually sent — after the editor edited the generated draft. */
    letterBody: text('letter_body').notNull(),
    isAppeal: boolean('is_appeal').notNull().default(false),
    createdAt: now(),
  },
  (t) => [index('decisions_manuscript_idx').on(t.manuscriptId, t.round)],
)

/* ================================================================== *
 * MONEY
 * ================================================================== */

export const charges = pgTable(
  'charges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    /** Copied from the policy snapshot, never from live settings. */
    amountMinor: integer('amount_minor').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    waivedById: uuid('waived_by_id').references(() => users.id),
    waiverReason: text('waiver_reason'),
    paystackReference: text('paystack_reference'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: now(),
  },
  (t) => [uniqueIndex('charges_manuscript_uq').on(t.manuscriptId)],
)

/* ================================================================== *
 * HISTORY — append-only, never updated, never deleted
 * ================================================================== */

export const statusTransitions = pgTable(
  'status_transitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    manuscriptId: uuid('manuscript_id').notNull().references(() => manuscripts.id),
    fromStatus: manuscriptStatus('from_status'),
    toStatus: manuscriptStatus('to_status').notNull(),
    actorId: uuid('actor_id').references(() => users.id), // null = system
    reason: text('reason'),
    createdAt: now(),
  },
  (t) => [index('transitions_manuscript_idx').on(t.manuscriptId, t.createdAt)],
)

/** Every settings save. Evidence in an appeal. */
export const settingsHistory = pgTable(
  'settings_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').notNull().references(() => journals.id),
    actorId: uuid('actor_id').notNull().references(() => users.id),
    policyVersion: integer('policy_version').notNull(),
    /** Human-readable lines from diffPolicy(). */
    changes: jsonb('changes').$type<string[]>().notNull(),
    before: jsonb('before').$type<JournalPolicyPatch>().notNull(),
    after: jsonb('after').$type<JournalPolicyPatch>().notNull(),
    createdAt: now(),
  },
  (t) => [index('settings_history_idx').on(t.journalId, t.createdAt)],
)

/** Everything else worth answering for: impersonation, exports, role grants. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id').references(() => journals.id),
    actorId: uuid('actor_id').references(() => users.id),
    /** Set when the action was taken while impersonating. Always loud. */
    impersonatedById: uuid('impersonated_by_id').references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    ipAddress: text('ip_address'),
    createdAt: now(),
  },
  (t) => [index('audit_entity_idx').on(t.entityType, t.entityId), index('audit_journal_idx').on(t.journalId, t.createdAt)],
)

/* ================================================================== *
 * RELATIONS
 * ================================================================== */

export const journalsRelations = relations(journals, ({ many }) => ({
  sections: many(sections),
  manuscripts: many(manuscripts),
  memberships: many(memberships),
}))

export const manuscriptsRelations = relations(manuscripts, ({ one, many }) => ({
  journal: one(journals, { fields: [manuscripts.journalId], references: [journals.id] }),
  section: one(sections, { fields: [manuscripts.sectionId], references: [sections.id] }),
  handlingEditor: one(users, { fields: [manuscripts.handlingEditorId], references: [users.id] }),
  authors: many(manuscriptAuthors),
  versions: many(manuscriptVersions),
  files: many(files),
  assignments: many(reviewAssignments),
  decisions: many(decisions),
  transitions: many(statusTransitions),
}))

export const reviewAssignmentsRelations = relations(reviewAssignments, ({ one }) => ({
  manuscript: one(manuscripts, {
    fields: [reviewAssignments.manuscriptId],
    references: [manuscripts.id],
  }),
  reviewer: one(users, { fields: [reviewAssignments.reviewerId], references: [users.id] }),
  review: one(reviews, { fields: [reviewAssignments.id], references: [reviews.assignmentId] }),
}))

/* ================================================================== *
 * ROW-LEVEL SECURITY
 *
 * Run as a migration. The app connects as a non-superuser role and sets
 * `SET LOCAL app.journal_id = '<uuid>'` at the start of every request
 * transaction. RLS is the backstop for the day someone forgets a WHERE clause.
 *
 *   ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
 *   ALTER TABLE manuscripts FORCE ROW LEVEL SECURITY;
 *   CREATE POLICY tenant_isolation ON manuscripts
 *     USING (journal_id = current_setting('app.journal_id', true)::uuid);
 *
 * Repeat for every table carrying journal_id. Platform admin work runs in a
 * separate connection role that bypasses the policy — and writes audit_log.
 * ================================================================== */
