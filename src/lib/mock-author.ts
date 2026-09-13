import type { ManuscriptStatus } from './types'

/** What the corresponding author sees. Deliberately a different shape from the
 *  editor's row: no reviewer identities, no similarity score, no editor notes. */
export interface AuthorSubmission {
  id: string
  reference: string
  title: string
  status: ManuscriptStatus
  submittedAt: string
  round: number
  /** Plain-language next step, written for someone who does not know the workflow. */
  whatHappensNext: string
  actionRequired: boolean
  reviewsReceived: number
}

export const MY_SUBMISSIONS: AuthorSubmission[] = [
  {
    id: 'm1',
    reference: 'UJER-2026-0147',
    title: 'Compressive Strength of Laterite-Cement Blocks Stabilised with Rice Husk Ash',
    status: 'decision_pending',
    submittedAt: '2 July 2026',
    round: 1,
    whatHappensNext: 'Both reviews are in and the editor is considering them. You will hear the decision by email.',
    actionRequired: false,
    reviewsReceived: 2,
  },
  {
    id: 'm5',
    reference: 'UJER-2026-0122',
    title: 'A Finite Element Study of Pile-Raft Foundations on Lagos Coastal Sands',
    status: 'revision_requested',
    submittedAt: '14 May 2026',
    round: 1,
    whatHappensNext: 'Revisions are requested. Upload a revised manuscript and a point-by-point response by 30 September.',
    actionRequired: true,
    reviewsReceived: 2,
  },
  {
    id: 'm9',
    reference: 'UJER-2025-0311',
    title: 'Durability of Interlocking Stabilised Soil Blocks Under Cyclic Wetting',
    status: 'published',
    submittedAt: '9 August 2025',
    round: 2,
    whatHappensNext: 'Published in Volume 11, Issue 4. DOI 10.60821/ujer.2025.0311.',
    actionRequired: false,
    reviewsReceived: 3,
  },
  {
    id: 'm10',
    reference: 'UJER-2025-0288',
    title: 'Rheology of Cement Pastes Blended with Calcined Lagos Clay',
    status: 'desk_rejected',
    submittedAt: '3 June 2025',
    round: 0,
    whatHappensNext: 'Returned without review as outside the journal’s scope. You are welcome to submit other work.',
    actionRequired: false,
    reviewsReceived: 0,
  },
]

/** The author's view of the reviews. Compare with REVIEWS in mock-manuscript.ts:
 *  no names, no recommendation, no confidential block. That gap is the product. */
export const AUTHOR_VISIBLE_REVIEWS = [
  {
    id: 'a1',
    label: 'Reviewer 1',
    body: 'The experimental programme is well designed and the three-borrow-pit sampling strategy is a real strength — most work in this area uses a single source and over-generalises. My concerns are presentational rather than technical. Table 4 reports strengths to three decimal places, which the test method does not support. Figure 6 needs error bars. The discussion in section 5.2 asserts a pozzolanic mechanism without citing the XRD results the authors themselves present in Figure 8.',
  },
  {
    id: 'a2',
    label: 'Reviewer 2',
    body: 'The central claim — that 10% RHA replacement is optimal — is not supported by the data as presented. The 28-day results for the 10% and 15% mixes overlap within one standard deviation (Table 5), so no optimum can be declared without a statistical test. I would want to see ANOVA across the replacement levels. Second, the curing regime is not stated anywhere in section 3; given the sensitivity of pozzolanic reactions to curing humidity, this is a material omission.',
  },
]

export interface ReviewInvitation {
  id: string
  token: string
  reference: string
  title: string
  section: string
  dueDate: string
  estimatedMinutes: number
  state: 'invited' | 'accepted' | 'submitted'
  daysLeft: number
}

export const MY_REVIEW_REQUESTS: ReviewInvitation[] = [
  {
    id: 'inv1',
    token: 'demo-token',
    reference: 'UJER-2026-0163',
    title: 'Optimisation of Biogas Yield from Co-Digested Market Waste in Lagos State',
    section: 'Chemical & Petroleum',
    dueDate: '12 October 2026',
    estimatedMinutes: 45,
    state: 'invited',
    daysLeft: 29,
  },
  {
    id: 'inv2',
    token: 'demo-accepted',
    reference: 'UJER-2026-0151',
    title: 'Short-Term Load Forecasting for the Lagos Distribution Network Using Gradient Boosting',
    section: 'Electrical & Electronics',
    dueDate: '20 September 2026',
    estimatedMinutes: 50,
    state: 'accepted',
    daysLeft: 7,
  },
  {
    id: 'inv3',
    token: 'demo-done',
    reference: 'UJER-2026-0118',
    title: 'Thermal Performance of Phase-Change Material Walls in Humid Tropical Climates',
    section: 'Mechanical',
    dueDate: '20 August 2026',
    estimatedMinutes: 40,
    state: 'submitted',
    daysLeft: 0,
  },
]
