/**
 * A review form instance, shaped exactly like review_form_questions in the schema:
 * every question carries a visibility flag, and scale questions carry their range.
 * In production this is fetched by the form version frozen onto the manuscript.
 */

export type QuestionType = 'scale' | 'long_text' | 'single_choice'
export type Visibility = 'author_and_editor' | 'editor_only'

export interface Question {
  id: string
  type: QuestionType
  label: string
  helpText?: string
  required: boolean
  visibility: Visibility
  /** scale */
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  /** single_choice */
  options?: { value: string; label: string }[]
}

export const REVIEW_FORM: { name: string; version: number; questions: Question[] } = {
  name: 'UJER standard review form',
  version: 3,
  questions: [
    {
      id: 'originality',
      type: 'scale',
      label: 'Originality',
      helpText: 'Does the work add something the literature does not already have?',
      required: true,
      visibility: 'author_and_editor',
      min: 1,
      max: 5,
      minLabel: 'Derivative',
      maxLabel: 'Highly original',
    },
    {
      id: 'soundness',
      type: 'scale',
      label: 'Technical soundness',
      helpText: 'Method, data, analysis. Do the conclusions follow from what is presented?',
      required: true,
      visibility: 'author_and_editor',
      min: 1,
      max: 5,
      minLabel: 'Unsound',
      maxLabel: 'Rigorous',
    },
    {
      id: 'clarity',
      type: 'scale',
      label: 'Clarity of presentation',
      required: true,
      visibility: 'author_and_editor',
      min: 1,
      max: 5,
      minLabel: 'Hard to follow',
      maxLabel: 'Very clear',
    },
    {
      id: 'relevance',
      type: 'scale',
      label: 'Relevance to the journal',
      required: true,
      visibility: 'author_and_editor',
      min: 1,
      max: 5,
      minLabel: 'Out of scope',
      maxLabel: 'Squarely in scope',
    },
    {
      id: 'summary',
      type: 'long_text',
      label: 'Comments to the author',
      helpText:
        'What the authors need in order to improve the work. This is sent to them with the decision letter, so write it as though they will read it — because they will.',
      required: true,
      visibility: 'author_and_editor',
    },
    {
      id: 'confidential',
      type: 'long_text',
      label: 'Confidential comments to the editor',
      helpText: 'Never shown to the author. Say the thing you would not put in the letter.',
      required: false,
      visibility: 'editor_only',
    },
    {
      id: 'recommendation',
      type: 'single_choice',
      label: 'Recommendation',
      required: true,
      visibility: 'editor_only',
      options: [
        { value: 'accept', label: 'Accept as is' },
        { value: 'minor_revision', label: 'Accept after minor revision' },
        { value: 'major_revision', label: 'Reconsider after major revision' },
        { value: 'reject', label: 'Reject' },
      ],
    },
  ],
}

/** What the reviewer is shown about the manuscript under double-blind review. */
export const ANONYMISED_MANUSCRIPT = {
  reference: 'UJER-2026-0163',
  title: 'Optimisation of Biogas Yield from Co-Digested Market Waste in Lagos State',
  section: 'Chemical & Petroleum',
  wordCount: 6840,
  figures: 8,
  tables: 4,
  abstract:
    'Organic market waste in Lagos State is largely landfilled despite a substantial methane potential. This study examines anaerobic co-digestion of mixed market waste with cow dung at four mixing ratios, monitoring biogas yield, methane fraction and volatile solids reduction over a 40-day retention period in 20-litre batch digesters...',
  estimatedMinutes: 45,
  dueDate: '12 October 2026',
  invitedBy: 'Dr. Adaeze Okonkwo, Handling Editor',
  blinding: 'double_blind' as const,
}
