/**
 * Editorial policy — the configurable surface of a journal.
 *
 * Resolution order (later wins):
 *   PLATFORM_DEFAULTS  ->  journal.policy  ->  section.policyOverrides  ->  manuscript override
 *
 * The resolved object is SNAPSHOTTED onto the manuscript at submission time and
 * never re-read from settings afterwards. See resolvePolicy() / freezePolicy().
 */

import { z } from 'zod'

/* ------------------------------------------------------------------ *
 * Vocabulary
 * ------------------------------------------------------------------ */

export const blindingMode = z.enum([
  'single_blind', // reviewer sees author; author does not see reviewer
  'double_blind', // neither side sees the other
  'open', // both sides disclosed during review
  'transparent', // open, and reviews published with the article
])
export type BlindingMode = z.infer<typeof blindingMode>

export const decisionType = z.enum([
  'accept',
  'minor_revision',
  'major_revision',
  'reject',
  'reject_with_resubmission',
  'desk_reject',
])

export const chargeTrigger = z.enum(['none', 'on_submission', 'on_acceptance', 'on_publication'])

/* ------------------------------------------------------------------ *
 * The policy object
 * ------------------------------------------------------------------ */

export const journalPolicySchema = z.object({
  review: z.object({
    blinding: blindingMode,
    /** Reviewer names published alongside the article. Independent of blinding. */
    publishReviewerNames: z.boolean(),
    /** Review text published alongside the article. */
    publishReviews: z.boolean(),

    reviewersInvitedPerRound: z.number().int().min(1).max(12),
    reviewsRequiredToDecide: z.number().int().min(1).max(12),
    maxRevisionRounds: z.number().int().min(0).max(10),

    reviewerDeadlineDays: z.number().int().min(1).max(180),
    /** Days after invitation before it auto-expires and a replacement is sought. */
    invitationExpiryDays: z.number().int().min(1).max(60),
    /** Days before/after the deadline on which reminders fire. Negative = before. */
    reminderScheduleDays: z.array(z.number().int()).max(8),

    allowAppeals: z.boolean(),
    availableDecisions: z.array(decisionType).min(1),
  }),

  submission: z.object({
    acceptedFileTypes: z.array(z.string()).min(1),
    maxFileSizeMb: z.number().int().min(1).max(500),
    requireOrcid: z.boolean(),
    requireStructuredAbstract: z.boolean(),
    abstractWordLimit: z.number().int().min(50).max(2000),
    maxKeywords: z.number().int().min(0).max(20),
    referenceStyle: z.string(),
    /** Declarations the corresponding author must affirm before submitting. */
    requiredDeclarations: z.array(
      z.enum([
        'ethics_approval',
        'conflict_of_interest',
        'funding',
        'data_availability',
        'generative_ai_use',
        'informed_consent',
        'authorship_agreement',
      ]),
    ),
  }),

  similarity: z.object({
    enabled: z.boolean(),
    provider: z.enum(['ithenticate', 'turnitin', 'none']),
    /** Score at or above which the manuscript is flagged for the managing editor. */
    flagThresholdPercent: z.number().int().min(1).max(100),
    /**
     * Score at or above which the manuscript is auto-desk-rejected.
     * null = never. Keep it null. Automated rejection on a similarity score
     * alone is how journals earn a reputation they cannot shed.
     */
    autoRejectThresholdPercent: z.number().int().min(1).max(100).nullable(),
    excludeQuotes: z.boolean(),
    excludeBibliography: z.boolean(),
    excludeSmallMatchesPercent: z.number().int().min(0).max(10),
  }),

  publishing: z.object({
    licence: z.string(), // e.g. 'CC-BY-4.0'
    model: z.enum(['issue', 'continuous']),
    embargoDays: z.number().int().min(0).max(1095),
    doiPattern: z.string(), // e.g. '{prefix}/ujeng.{year}.{articleNumber}'
    archiveTo: z.array(z.enum(['pkp_pn', 'clockss', 'internet_archive', 'none'])),
  }),

  fees: z.object({
    trigger: chargeTrigger,
    amountMinor: z.number().int().min(0), // kobo
    currency: z.enum(['NGN', 'USD']),
    /** ISO-3166 alpha-2 codes that are automatically waived. */
    autoWaiveCountries: z.array(z.string().length(2)),
    autoWaiveStudentAuthors: z.boolean(),
  }),
})

export type JournalPolicy = z.infer<typeof journalPolicySchema>

/**
 * Sections and per-manuscript overrides carry a deep partial of the same shape.
 * (Zod 4 dropped .deepPartial(), so the groups are partialled explicitly.)
 */
export const journalPolicyPatchSchema = z
  .object({
    review: journalPolicySchema.shape.review.partial(),
    submission: journalPolicySchema.shape.submission.partial(),
    similarity: journalPolicySchema.shape.similarity.partial(),
    publishing: journalPolicySchema.shape.publishing.partial(),
    fees: journalPolicySchema.shape.fees.partial(),
  })
  .partial()

export type JournalPolicyPatch = z.infer<typeof journalPolicyPatchSchema>

/* ------------------------------------------------------------------ *
 * Platform defaults — COPE-aligned, so a new journal is publishable
 * without touching eighty settings.
 * ------------------------------------------------------------------ */

export const PLATFORM_DEFAULTS: JournalPolicy = {
  review: {
    blinding: 'double_blind',
    publishReviewerNames: false,
    publishReviews: false,
    reviewersInvitedPerRound: 4,
    reviewsRequiredToDecide: 2,
    maxRevisionRounds: 3,
    reviewerDeadlineDays: 28,
    invitationExpiryDays: 7,
    reminderScheduleDays: [-7, -1, 3, 10],
    allowAppeals: true,
    availableDecisions: [
      'accept',
      'minor_revision',
      'major_revision',
      'reject',
      'reject_with_resubmission',
      'desk_reject',
    ],
  },
  submission: {
    acceptedFileTypes: ['.docx', '.pdf', '.tex', '.zip'],
    maxFileSizeMb: 60,
    requireOrcid: false,
    requireStructuredAbstract: false,
    abstractWordLimit: 300,
    maxKeywords: 6,
    referenceStyle: 'IEEE',
    requiredDeclarations: [
      'conflict_of_interest',
      'funding',
      'data_availability',
      'generative_ai_use',
      'authorship_agreement',
    ],
  },
  similarity: {
    enabled: true,
    provider: 'ithenticate',
    flagThresholdPercent: 20,
    autoRejectThresholdPercent: null,
    excludeQuotes: true,
    excludeBibliography: true,
    excludeSmallMatchesPercent: 1,
  },
  publishing: {
    licence: 'CC-BY-4.0',
    model: 'issue',
    embargoDays: 0,
    doiPattern: '{prefix}/{journalSlug}.{year}.{articleNumber}',
    archiveTo: ['pkp_pn'],
  },
  fees: {
    trigger: 'on_acceptance',
    amountMinor: 0,
    currency: 'NGN',
    autoWaiveCountries: [],
    autoWaiveStudentAuthors: false,
  },
}

/* ------------------------------------------------------------------ *
 * Resolution and freezing
 * ------------------------------------------------------------------ */

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return patch as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v === undefined) continue
    out[k] = deepMerge((base as Record<string, unknown>)[k], v)
  }
  return out as T
}

/**
 * Compute the policy that applies right now to a submission in a given section.
 * Use this at submission time, and in the settings UI to preview effects.
 */
export function resolvePolicy(
  journalPatch: JournalPolicyPatch | null,
  sectionPatch: JournalPolicyPatch | null = null,
  manuscriptPatch: JournalPolicyPatch | null = null,
): JournalPolicy {
  let p: JournalPolicy = PLATFORM_DEFAULTS
  p = deepMerge(p, journalPatch)
  p = deepMerge(p, sectionPatch)
  p = deepMerge(p, manuscriptPatch)
  return journalPolicySchema.parse(p)
}

export interface FrozenPolicy {
  policy: JournalPolicy
  frozenAt: string
  /** Which review form version this manuscript is bound to. */
  reviewFormId: string
  /** Provenance, so an appeal two years from now can be answered. */
  source: {
    journalPolicyVersion: number
    sectionId: string | null
  }
}

/**
 * Called exactly once, on transition DRAFT -> SUBMITTED.
 * Everything downstream reads manuscripts.policySnapshot, never the live tables.
 */
export function freezePolicy(args: {
  journalPatch: JournalPolicyPatch | null
  journalPolicyVersion: number
  sectionPatch: JournalPolicyPatch | null
  sectionId: string | null
  reviewFormId: string
}): FrozenPolicy {
  return {
    policy: resolvePolicy(args.journalPatch, args.sectionPatch),
    frozenAt: new Date().toISOString(),
    reviewFormId: args.reviewFormId,
    source: {
      journalPolicyVersion: args.journalPolicyVersion,
      sectionId: args.sectionId,
    },
  }
}

/**
 * Blast radius for the settings UI: "12 manuscripts are under review under the
 * existing policy. They will keep it." Show this before every save.
 */
export function diffPolicy(before: JournalPolicy, after: JournalPolicy): string[] {
  const changes: string[] = []
  const walk = (a: unknown, b: unknown, path: string[]) => {
    if (typeof a === 'object' && a !== null && !Array.isArray(a)) {
      for (const k of Object.keys(a as Record<string, unknown>)) {
        walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)?.[k], [...path, k])
      }
      return
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push(`${path.join('.')}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`)
    }
  }
  walk(before, after, [])
  return changes
}
