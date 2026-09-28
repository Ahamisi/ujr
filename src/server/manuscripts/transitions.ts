import type { ManuscriptStatus } from '@/lib/types'

/**
 * Legal status changes. Anything not listed here is rejected, including a
 * move backwards. Withdrawing a published article is a retraction, which is
 * its own status, because the version of record has to keep existing.
 */
export const TRANSITIONS: Record<ManuscriptStatus, readonly ManuscriptStatus[]> = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['desk_review', 'desk_rejected', 'withdrawn'],
  desk_review: ['reviewer_search', 'desk_rejected', 'withdrawn'],
  desk_rejected: [],
  rejected: [],
  reviewer_search: ['under_review', 'desk_rejected', 'withdrawn'],
  under_review: ['decision_pending', 'reviewer_search', 'withdrawn'],
  decision_pending: ['revision_requested', 'accepted', 'rejected', 'withdrawn'],
  revision_requested: ['resubmitted', 'withdrawn'],
  resubmitted: ['under_review', 'decision_pending', 'reviewer_search', 'withdrawn'],
  accepted: ['in_production', 'withdrawn'],
  in_production: ['published'],
  published: ['corrected', 'retracted'],
  corrected: ['retracted'],
  retracted: [],
  withdrawn: [],
}

export function canTransition(from: ManuscriptStatus, to: ManuscriptStatus) {
  return TRANSITIONS[from].includes(to)
}

/** The manuscript status a recorded decision becomes. */
export const DECISION_STATUS = {
  accept: 'accepted',
  minor_revision: 'revision_requested',
  major_revision: 'revision_requested',
  reject: 'rejected',
  reject_with_resubmission: 'rejected',
  desk_reject: 'desk_rejected',
} as const
