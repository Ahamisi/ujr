import { MANUSCRIPTS } from './mock-data'
import type { Recommendation } from './types'

export interface ScoredCriterion {
  label: string
  score: number
  outOf: number
}

export interface ReviewDetail {
  id: string
  displayName: string
  submittedAt: string
  recommendation: Recommendation
  confidence: number
  criteria: ScoredCriterion[]
  /** Shown to the author with the decision letter. */
  toAuthor: string
  /** Never leaves the editorial office. */
  toEditor: string | null
  annotationCount: number
}

export type ActivityKind = 'system' | 'comment' | 'decision'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  actor: string
  /** For system entries: the whole line. For comments: the body. */
  text: string
  at: string
  tone?: 'default' | 'warning' | 'success' | 'danger'
}

export const MANUSCRIPT_DETAIL = {
  id: 'm1',
  reference: 'UJER-2026-0147',
  title: 'Compressive Strength of Laterite-Cement Blocks Stabilised with Rice Husk Ash',
  section: 'Civil & Structural',
  status: 'decision_pending' as const,
  round: 1,
  submittedAt: '2 July 2026',
  daysInStatus: 9,
  similarityPercent: 8,
  handlingEditor: 'Dr. Adaeze Okonkwo',
  blinding: 'double_blind' as const,
  licence: 'CC BY 4.0',
  reviewsRequired: 2,
  authors: [
    { name: 'I. Balogun', affiliation: 'University of Lagos', corresponding: true, orcid: '0000-0002-1825-0097' },
    { name: 'O. Adewale', affiliation: 'University of Lagos', corresponding: false, orcid: null },
    { name: 'N. Chukwu', affiliation: 'Federal University of Technology, Akure', corresponding: false, orcid: null },
    { name: 'B. Salami', affiliation: 'University of Lagos', corresponding: false, orcid: null },
  ],
  abstract:
    'Laterite-cement blocks remain the dominant walling material in low-cost housing across south-western Nigeria, but their compressive strength is highly sensitive to cement content, which drives cost. This study evaluates rice husk ash (RHA) as a partial cement replacement at 5, 10, 15 and 20% by weight, using laterite sourced from three Lagos-area borrow pits...',
}

export const REVIEWS: ReviewDetail[] = [
  {
    id: 'rev1',
    displayName: 'Reviewer 1',
    submittedAt: '28 August 2026',
    recommendation: 'minor_revision',
    confidence: 4,
    criteria: [
      { label: 'Originality', score: 3, outOf: 5 },
      { label: 'Technical soundness', score: 4, outOf: 5 },
      { label: 'Clarity of presentation', score: 4, outOf: 5 },
      { label: 'Relevance to the journal', score: 5, outOf: 5 },
    ],
    toAuthor:
      'The experimental programme is well designed and the three-borrow-pit sampling strategy is a real strength — most work in this area uses a single source and over-generalises. My concerns are presentational rather than technical. Table 4 reports strengths to three decimal places, which the test method does not support. Figure 6 needs error bars. The discussion in section 5.2 asserts a pozzolanic mechanism without citing the XRD results the authors themselves present in Figure 8.',
    toEditor:
      'Solid paper, worth publishing after tidying. The lead author appears to be a postgraduate student; the writing would benefit from a copyedit pass regardless of the review outcome.',
    annotationCount: 11,
  },
  {
    id: 'rev2',
    displayName: 'Reviewer 2',
    submittedAt: '31 August 2026',
    recommendation: 'major_revision',
    confidence: 5,
    criteria: [
      { label: 'Originality', score: 2, outOf: 5 },
      { label: 'Technical soundness', score: 2, outOf: 5 },
      { label: 'Clarity of presentation', score: 3, outOf: 5 },
      { label: 'Relevance to the journal', score: 4, outOf: 5 },
    ],
    toAuthor:
      'The central claim — that 10% RHA replacement is optimal — is not supported by the data as presented. The 28-day results for the 10% and 15% mixes overlap within one standard deviation (Table 5), so no optimum can be declared without a statistical test. I would want to see ANOVA across the replacement levels. Second, the curing regime is not stated anywhere in section 3; given the sensitivity of pozzolanic reactions to curing humidity, this is a material omission.',
    toEditor:
      'I am not comfortable with accept-after-minor-revisions here. The statistical point is not cosmetic — if the ANOVA does not separate the 10% and 15% mixes, the paper’s headline conclusion has to change. Happy to look at a revision.',
    annotationCount: 23,
  },
]

export const ACTIVITY: ActivityEntry[] = [
  { id: 'a1', kind: 'system', actor: 'System', text: 'Similarity check returned 8% — below the 20% flag threshold', at: '2 Jul, 14:22' },
  { id: 'a2', kind: 'system', actor: 'M. Adeleke', text: 'passed desk check and assigned A. Okonkwo as handling editor', at: '4 Jul, 09:10' },
  { id: 'a3', kind: 'system', actor: 'A. Okonkwo', text: 'invited 3 reviewers', at: '11 Jul, 16:45' },
  { id: 'a4', kind: 'system', actor: 'Reviewer 3', text: 'declined — outside area of expertise', at: '13 Jul, 08:02', tone: 'warning' },
  { id: 'a5', kind: 'system', actor: 'Reviewer 1', text: 'accepted the invitation', at: '14 Jul, 11:30' },
  { id: 'a6', kind: 'system', actor: 'System', text: 'sent reminders to 1 reviewer', at: '21 Aug, 06:00' },
  { id: 'a7', kind: 'system', actor: 'Reviewer 1', text: 'submitted a review — recommends minor revision', at: '28 Aug, 19:14', tone: 'success' },
  {
    id: 'a8',
    kind: 'comment',
    actor: 'A. Okonkwo',
    text: 'Reviewer 2 is more critical than Reviewer 1 on exactly the point that matters — whether an optimum can be claimed at all. I do not think a third review changes that. Leaning major revision, and I will ask them to run the ANOVA explicitly.',
    at: '2 Sep, 10:08',
  },
  {
    id: 'a9',
    kind: 'comment',
    actor: 'M. Adeleke',
    text: 'Agreed. Worth flagging the curing regime omission separately in the letter so it does not get lost behind the statistics point.',
    at: '2 Sep, 12:41',
  },
  { id: 'a10', kind: 'system', actor: 'Reviewer 2', text: 'submitted a review — recommends major revision', at: '31 Aug, 13:55', tone: 'success' },
]

/**
 * Resolve a manuscript by id. Only UJER-2026-0147 has a full record with reviews;
 * every other row is rendered from what the desk already knows, so navigating to
 * any manuscript lands on that manuscript rather than on a fixture.
 */
export function getManuscriptDetail(id: string) {
  if (id === MANUSCRIPT_DETAIL.id) {
    return { detail: MANUSCRIPT_DETAIL, reviews: REVIEWS, activity: ACTIVITY }
  }

  const row = MANUSCRIPTS.find((m) => m.id === id)
  if (!row) return null

  return {
    detail: {
      ...MANUSCRIPT_DETAIL,
      id: row.id,
      reference: row.reference,
      title: row.title,
      section: row.section,
      status: row.status,
      round: row.round,
      submittedAt: row.submittedAt,
      daysInStatus: row.daysInStatus,
      similarityPercent: row.similarityPercent,
      handlingEditor: row.handlingEditor ?? 'Unassigned',
      abstract: 'The full text and abstract for this manuscript load from the submission record.',
      authors: [
        {
          name: row.correspondingAuthor,
          affiliation: 'University of Lagos',
          corresponding: true,
          orcid: null as string | null,
        },
      ],
    },
    reviews: [] as ReviewDetail[],
    activity: [
      {
        id: 'a1',
        kind: 'system' as const,
        actor: 'System',
        text: `received and logged as ${row.reference}`,
        at: row.submittedAt,
      },
      ...row.reviewers.map((r, i) => ({
        id: `a${i + 2}`,
        kind: 'system' as const,
        actor: r.displayName,
        text:
          r.status === 'submitted'
            ? 'submitted a review'
            : r.status === 'declined'
              ? 'declined the invitation'
              : r.status === 'expired'
                ? 'did not answer — the invitation expired'
                : 'was invited',
        at: r.dueAt,
        tone:
          r.status === 'submitted'
            ? ('success' as const)
            : r.status === 'declined' || r.status === 'expired'
              ? ('warning' as const)
              : undefined,
      })),
    ] as ActivityEntry[],
  }
}
