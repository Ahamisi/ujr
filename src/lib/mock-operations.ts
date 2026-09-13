/** Placeholder data for the operational screens. Delete once the DB is wired. */

export interface ReviewerRecord {
  id: string
  name: string
  affiliation: string
  country: string
  expertise: string[]
  invited: number
  completed: number
  declined: number
  /** Median days from acceptance to submitted review. */
  medianTurnaroundDays: number | null
  lastInvited: string
  sharedPool: boolean
}

export const REVIEWERS: ReviewerRecord[] = [
  { id: 'u1', name: 'Prof. Yemi Ogunsanya', affiliation: 'University of Lagos', country: 'NG', expertise: ['Geotechnics', 'Foundations'], invited: 14, completed: 12, declined: 1, medianTurnaroundDays: 19, lastInvited: '2026-08-30', sharedPool: true },
  { id: 'u2', name: 'Dr. Ifeoma Nwachukwu', affiliation: 'Covenant University', country: 'NG', expertise: ['Concrete', 'Supplementary cementitious materials'], invited: 9, completed: 8, declined: 1, medianTurnaroundDays: 14, lastInvited: '2026-09-02', sharedPool: true },
  { id: 'u3', name: 'Dr. Kwame Asante', affiliation: 'KNUST, Kumasi', country: 'GH', expertise: ['Power systems', 'Load forecasting'], invited: 6, completed: 4, declined: 2, medianTurnaroundDays: 31, lastInvited: '2026-07-19', sharedPool: true },
  { id: 'u4', name: 'Dr. Segun Adebayo', affiliation: 'Obafemi Awolowo University', country: 'NG', expertise: ['Corrosion', 'Materials characterisation'], invited: 11, completed: 6, declined: 5, medianTurnaroundDays: 38, lastInvited: '2026-08-21', sharedPool: false },
  { id: 'u5', name: 'Prof. Amina Bello', affiliation: 'Ahmadu Bello University', country: 'NG', expertise: ['Thermal systems', 'Building physics'], invited: 7, completed: 7, declined: 0, medianTurnaroundDays: 12, lastInvited: '2026-08-04', sharedPool: true },
  { id: 'u6', name: 'Dr. Ravi Menon', affiliation: 'IIT Madras', country: 'IN', expertise: ['Machine vision', 'Non-destructive testing'], invited: 3, completed: 1, declined: 1, medianTurnaroundDays: 27, lastInvited: '2026-09-06', sharedPool: true },
  { id: 'u7', name: 'Dr. Chinedu Obi', affiliation: 'University of Nigeria, Nsukka', country: 'NG', expertise: ['Biogas', 'Waste valorisation'], invited: 5, completed: 3, declined: 1, medianTurnaroundDays: 22, lastInvited: '2026-06-11', sharedPool: false },
  { id: 'u8', name: 'Dr. Funmi Lawal', affiliation: 'University of Lagos', country: 'NG', expertise: ['Transport planning', 'Traffic modelling'], invited: 8, completed: 7, declined: 0, medianTurnaroundDays: 16, lastInvited: '2026-08-28', sharedPool: true },
  { id: 'u9', name: 'Prof. Hassan Ibrahim', affiliation: 'Bayero University Kano', country: 'NG', expertise: ['Structural dynamics'], invited: 4, completed: 0, declined: 3, medianTurnaroundDays: null, lastInvited: '2026-05-02', sharedPool: false },
]

export interface IssueRecord {
  id: string
  volume: number
  number: number
  title: string | null
  status: 'planning' | 'open' | 'published'
  articleCount: number
  targetDate: string
  publishedDate: string | null
}

export const ISSUES: IssueRecord[] = [
  { id: 'i1', volume: 12, number: 3, title: null, status: 'planning', articleCount: 2, targetDate: '2026-12-15', publishedDate: null },
  { id: 'i2', volume: 12, number: 2, title: 'Special Issue: Sustainable Construction Materials', status: 'open', articleCount: 7, targetDate: '2026-09-30', publishedDate: null },
  { id: 'i3', volume: 12, number: 1, title: null, status: 'published', articleCount: 9, targetDate: '2026-03-31', publishedDate: '2026-03-28' },
  { id: 'i4', volume: 11, number: 4, title: null, status: 'published', articleCount: 8, targetDate: '2025-12-15', publishedDate: '2025-12-19' },
  { id: 'i5', volume: 11, number: 3, title: 'Special Issue: Energy Systems in West Africa', status: 'published', articleCount: 11, targetDate: '2025-09-30', publishedDate: '2025-10-06' },
]

export type ProductionStage = 'copyediting' | 'typesetting' | 'proofing' | 'ready'

export interface ProductionItem {
  id: string
  reference: string
  title: string
  stage: ProductionStage
  assignee: string
  daysInStage: number
  targetIssue: string
  doiAssigned: boolean
}

export const PRODUCTION: ProductionItem[] = [
  { id: 'p1', reference: 'UJER-2026-0118', title: 'Thermal Performance of Phase-Change Material Walls in Humid Tropical Climates', stage: 'copyediting', assignee: 'T. Nwosu', daysInStage: 6, targetIssue: '12(2)', doiAssigned: false },
  { id: 'p2', reference: 'UJER-2026-0104', title: 'Shear Behaviour of Recycled Aggregate Concrete Beams Without Stirrups', stage: 'typesetting', assignee: 'Lagos Typeset Ltd', daysInStage: 11, targetIssue: '12(2)', doiAssigned: true },
  { id: 'p3', reference: 'UJER-2026-0097', title: 'Groundwater Quality Indexing Across the Lagos Lagoon Catchment', stage: 'proofing', assignee: 'A. Okafor (author)', daysInStage: 3, targetIssue: '12(2)', doiAssigned: true },
  { id: 'p4', reference: 'UJER-2026-0089', title: 'Reliability Assessment of Distribution Transformers Under Nigerian Load Profiles', stage: 'proofing', assignee: 'S. Umar (author)', daysInStage: 19, targetIssue: '12(2)', doiAssigned: true },
  { id: 'p5', reference: 'UJER-2026-0082', title: 'A Low-Cost Sensor Array for Particulate Monitoring in Urban Lagos', stage: 'ready', assignee: '—', daysInStage: 2, targetIssue: '12(2)', doiAssigned: true },
]

/** Monthly submission and decision counts for the reporting screen. */
export const MONTHLY = [
  { month: 'Oct', submissions: 11, decisions: 7 },
  { month: 'Nov', submissions: 14, decisions: 9 },
  { month: 'Dec', submissions: 8, decisions: 12 },
  { month: 'Jan', submissions: 19, decisions: 10 },
  { month: 'Feb', submissions: 22, decisions: 13 },
  { month: 'Mar', submissions: 17, decisions: 16 },
  { month: 'Apr', submissions: 15, decisions: 14 },
  { month: 'May', submissions: 21, decisions: 12 },
  { month: 'Jun', submissions: 26, decisions: 15 },
  { month: 'Jul', submissions: 24, decisions: 18 },
  { month: 'Aug', submissions: 29, decisions: 17 },
  { month: 'Sep', submissions: 12, decisions: 6 },
]

export const DECISION_MIX = [
  { label: 'Accepted', count: 34 },
  { label: 'Minor revision', count: 41 },
  { label: 'Major revision', count: 38 },
  { label: 'Rejected after review', count: 29 },
  { label: 'Desk rejected', count: 47 },
]

export const TURNAROUND = {
  medianDaysToFirstDecision: 63,
  medianDaysToDeskDecision: 6,
  medianDaysToPublication: 148,
  reviewerAcceptanceRate: 0.58,
}
