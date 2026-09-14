/** UI-facing types. These mirror db/schema.ts enums — keep them in step. */

export type ManuscriptStatus =
  | 'draft'
  | 'submitted'
  | 'desk_review'
  | 'desk_rejected'
  | 'reviewer_search'
  | 'under_review'
  | 'decision_pending'
  | 'revision_requested'
  | 'resubmitted'
  | 'accepted'
  | 'in_production'
  | 'published'
  | 'corrected'
  | 'retracted'
  | 'withdrawn'

export type AssignmentStatus = 'invited' | 'accepted' | 'declined' | 'expired' | 'submitted' | 'withdrawn'

export type Recommendation = 'accept' | 'minor_revision' | 'major_revision' | 'reject'

export type BlindingMode = 'single_blind' | 'double_blind' | 'open' | 'transparent'

export interface ReviewerChip {
  id: string
  /** The blinded label — "Reviewer 1". This is the ONLY name an author may see. */
  displayName: string
  /** The real person. Editor-facing views only; never serialise this to an author. */
  realName: string
  status: AssignmentStatus
  dueAt: string
  recommendation?: Recommendation
}

export interface ManuscriptRow {
  id: string
  reference: string
  title: string
  section: string
  status: ManuscriptStatus
  correspondingAuthor: string
  authorCount: number
  handlingEditor: string | null
  round: number
  submittedAt: string
  /** Days since the status last changed — the number an editor actually triages on. */
  daysInStatus: number
  similarityPercent: number | null
  reviewers: ReviewerChip[]
  blinding: BlindingMode
  hasOverdueReview: boolean
}
