import type { ManuscriptStatus, AssignmentStatus, Recommendation } from './types'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info'

/**
 * Status presentation lives in one place. Colour encodes *who is blocked*,
 * not how far along the manuscript is:
 *   warning  = waiting on us (the editorial office)
 *   info     = waiting on someone outside (reviewer or author)
 *   success  = resolved in the author's favour
 *   danger   = resolved against, or withdrawn
 */
export const STATUS_META: Record<ManuscriptStatus, { label: string; variant: BadgeVariant; blocking: string }> = {
  draft: { label: 'Draft', variant: 'outline', blocking: 'Author has not submitted' },
  submitted: { label: 'Submitted', variant: 'warning', blocking: 'Awaiting desk check' },
  desk_review: { label: 'Desk review', variant: 'warning', blocking: 'With the managing editor' },
  desk_rejected: { label: 'Desk rejected', variant: 'danger', blocking: 'Closed without review' },
  reviewer_search: { label: 'Finding reviewers', variant: 'warning', blocking: 'Editor is recruiting' },
  under_review: { label: 'Under review', variant: 'info', blocking: 'With reviewers' },
  decision_pending: { label: 'Decision due', variant: 'warning', blocking: 'Reviews are in — editor must decide' },
  revision_requested: { label: 'Revision requested', variant: 'info', blocking: 'With the author' },
  resubmitted: { label: 'Resubmitted', variant: 'warning', blocking: 'Awaiting re-review' },
  accepted: { label: 'Accepted', variant: 'success', blocking: 'Ready for production' },
  in_production: { label: 'In production', variant: 'info', blocking: 'Copyediting and typesetting' },
  published: { label: 'Published', variant: 'success', blocking: 'Version of record is live' },
  corrected: { label: 'Corrected', variant: 'info', blocking: 'Correction issued' },
  retracted: { label: 'Retracted', variant: 'danger', blocking: 'Retraction notice published' },
  withdrawn: { label: 'Withdrawn', variant: 'secondary', blocking: 'Withdrawn by the author' },
}

export const ASSIGNMENT_META: Record<AssignmentStatus, { label: string; dotClass: string }> = {
  invited: { label: 'Invited, no reply', dotClass: 'bg-muted-foreground/40' },
  accepted: { label: 'Accepted, in progress', dotClass: 'bg-info' },
  declined: { label: 'Declined', dotClass: 'bg-destructive/50' },
  expired: { label: 'Invitation expired', dotClass: 'bg-destructive/50' },
  submitted: { label: 'Review submitted', dotClass: 'bg-success' },
  withdrawn: { label: 'Withdrawn', dotClass: 'bg-muted-foreground/30' },
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  accept: 'Accept',
  minor_revision: 'Minor revision',
  major_revision: 'Major revision',
  reject: 'Reject',
}

/** Statuses where the editorial office is the blocker. Drives the "Needs you" view. */
export const NEEDS_ACTION: ManuscriptStatus[] = [
  'submitted',
  'desk_review',
  'reviewer_search',
  'decision_pending',
  'resubmitted',
]
