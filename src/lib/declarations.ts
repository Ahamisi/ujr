/** Keys stored on the journal policy. The submit form and the server both use these. */
export const DECLARATION_KEYS = [
  'ethics_approval',
  'conflict_of_interest',
  'funding',
  'data_availability',
  'generative_ai_use',
  'informed_consent',
  'authorship_agreement',
] as const

export type DeclarationKey = (typeof DECLARATION_KEYS)[number]

export const DECLARATION_LABELS: Record<DeclarationKey, string> = {
  ethics_approval: 'Ethics approval is stated, or the work did not need it',
  conflict_of_interest: 'No conflict of interest, or it is declared in the manuscript',
  funding: 'All funding sources are stated',
  data_availability: 'A data availability statement is included',
  generative_ai_use: 'Any use of generative AI is disclosed',
  informed_consent: 'Informed consent is stated, or it does not apply',
  authorship_agreement: 'All listed authors agreed to this submission',
}

/** What a new journal asks for until a manager changes it. */
export const DEFAULT_DECLARATIONS: DeclarationKey[] = [
  'conflict_of_interest',
  'funding',
  'data_availability',
  'generative_ai_use',
  'authorship_agreement',
]
