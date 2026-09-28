import type { AssignmentStatus, BlindingMode, ManuscriptRow, ManuscriptStatus } from './types'
import { formatWhen } from './api'

export interface QueueRow {
  id: string
  reference: string
  title: string
  status: ManuscriptStatus
  section: string
  correspondingAuthor: string
  authorCount: number
  handlingEditor: string | null
  round: number
  submittedAt: string | null
  daysInStatus: number
  similarityPercent: number | null
  blinding: BlindingMode | null
  hasOverdueReview: boolean
  reviewers: {
    id: string
    displayName: string
    realName: string
    status: AssignmentStatus
    dueAt: string
  }[]
}

export function toManuscriptRow(row: QueueRow): ManuscriptRow {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    section: row.section || '—',
    status: row.status,
    correspondingAuthor: row.correspondingAuthor,
    authorCount: row.authorCount,
    handlingEditor: row.handlingEditor,
    round: row.round,
    submittedAt: formatWhen(row.submittedAt),
    daysInStatus: row.daysInStatus,
    similarityPercent: row.similarityPercent,
    reviewers: row.reviewers,
    blinding: row.blinding ?? 'double_blind',
    hasOverdueReview: row.hasOverdueReview,
  }
}
