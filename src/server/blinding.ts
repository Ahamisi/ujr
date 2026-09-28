import type { BlindingMode } from '@/db/policy'

/**
 * Blinding is a projection over a row, decided here and nowhere else.
 * An author response and an editor response must not be built from the
 * same object with fields hidden in the component.
 *
 * Open and transparent disclose identities during review.
 * single_blind discloses authors to the reviewer only.
 * double_blind discloses neither side.
 * Publishing reviewer names is a separate switch, and it applies to the
 * public article, not to the in-review author view.
 */

export type Audience = 'editor' | 'author' | 'reviewer' | 'public'

export function reviewerSeesAuthors(mode: BlindingMode) {
  return mode === 'single_blind' || mode === 'open' || mode === 'transparent'
}

export function authorSeesReviewerNames(mode: BlindingMode) {
  return mode === 'open' || mode === 'transparent'
}

export function publicSeesReviewerNames(publishReviewerNames: boolean) {
  return publishReviewerNames
}

/** Number reviewers in invitation order. The number is stable for the life of the round. */
export function reviewerLabel(index: number) {
  return `Reviewer ${index + 1}`
}
