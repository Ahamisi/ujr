/**
 * Creates the first journal, a section, the standard review form, and
 * (when passwords are set) an editor and an author.
 *
 *   DATABASE_URL=... BETTER_AUTH_SECRET=... SEED_EDITOR_PASSWORD=... SEED_AUTHOR_PASSWORD=... npm run db:seed
 *
 * Safe to run again. Existing rows are left as they are.
 */

import { and, eq, sql } from 'drizzle-orm'
import { db } from './client'
import { institutions, journals, memberships, reviewFormQuestions, reviewForms, sections, users } from './schema'
import { getAuth } from '@/server/auth/instance'
import { SEEDED_INSTITUTIONS, SEEDED_SECTIONS, catalogueKey } from '@/lib/catalogue'
import { ensureInstitution } from '@/server/institutions/service'
import { REVIEW_FORM, type Question } from '@/lib/review-form'

const SLUG = 'ujer'

async function main() {
  const [existing] = await db.select().from(journals).where(eq(journals.slug, SLUG)).limit(1)
  const journal =
    existing ??
    (
      await db
        .insert(journals)
        .values({
          slug: SLUG,
          name: 'UNILAG Journal of Engineering Research',
          abbreviation: 'UJER',
          issnElectronic: '2971-0448',
          issnPrint: '2971-043X',
          doiPrefix: '10.60821',
        })
        .returning()
    )[0]

  const existingSections = await db.select().from(sections).where(eq(sections.journalId, journal.id))
  let formId = existingSections.find((row) => row.activeReviewFormId)?.activeReviewFormId ?? null
  if (!formId) {
    const createdFormId = crypto.randomUUID()
    const familyId = crypto.randomUUID()
    await db.insert(reviewForms).values({
      id: createdFormId,
      journalId: journal.id,
      familyId,
      version: REVIEW_FORM.version,
      name: REVIEW_FORM.name,
      status: 'published',
    })
    await db.insert(reviewFormQuestions).values(
      REVIEW_FORM.questions.map((question, index) => ({
        formId: createdFormId,
        sortOrder: index,
        type: question.type,
        label: question.label,
        helpText: question.helpText,
        isRequired: question.required,
        visibility: question.visibility,
        config: configFor(question),
        includeInSummary: question.type === 'scale',
      })),
    )
    formId = createdFormId
  }
  const activeFormId = formId
  const known = new Set(existingSections.map((row) => catalogueKey(row.name)))
  const missing = SEEDED_SECTIONS.filter((section) => !known.has(catalogueKey(section.name)))
  if (missing.length > 0) {
    await db.insert(sections).values(
      missing.map((section, index) => ({
        journalId: journal.id,
        name: section.name,
        abbreviation: section.abbreviation,
        activeReviewFormId: activeFormId,
        sortOrder: existingSections.length + index,
      })),
    )
  }
  const section = existingSections[0] ?? { name: SEEDED_SECTIONS[0].name }
  for (const name of SEEDED_INSTITUTIONS) {
    await ensureInstitution(name, false)
  }
  await db
    .update(institutions)
    .set({ useCount: sql`greatest(${institutions.useCount}, 1)` })
    .where(eq(institutions.nameKey, catalogueKey('University of Lagos')))

  const editor = await ensureUser({
    email: 'okonkwo@unilag.edu.ng',
    password: process.env.SEED_EDITOR_PASSWORD,
    name: 'Dr. Adaeze Okonkwo',
    givenName: 'Adaeze',
    familyName: 'Okonkwo',
  })
  const author = await ensureUser({
    email: 'balogun@unilag.edu.ng',
    password: process.env.SEED_AUTHOR_PASSWORD,
    name: 'Dr. Ifeanyi Balogun',
    givenName: 'Ifeanyi',
    familyName: 'Balogun',
  })

  if (editor) {
    await ensureMembership(journal.id, editor.id, 'handling_editor')
    await ensureMembership(journal.id, editor.id, 'journal_manager')
  }
  if (author) await ensureMembership(journal.id, author.id, 'author')

  console.info(`Journal ${journal.slug} (${journal.id}), section ${section?.name ?? 'missing'}`)
  if (!editor || !author) {
    console.info('Set SEED_EDITOR_PASSWORD and SEED_AUTHOR_PASSWORD to create the two accounts.')
  }
  process.exit(0)
}

function configFor(question: Question): Record<string, unknown> {
  if (question.type === 'scale') {
    return { min: question.min, max: question.max, minLabel: question.minLabel, maxLabel: question.maxLabel }
  }
  if (question.type === 'single_choice') return { options: question.options ?? [] }
  return {}
}

async function ensureUser(input: {
  email: string
  password: string | undefined
  name: string
  givenName: string
  familyName: string
}) {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
  if (existing) return existing
  if (!input.password) return null
  if (!process.env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is required to seed accounts')
  await getAuth().api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
      givenName: input.givenName,
      familyName: input.familyName,
    },
  })
  const [created] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
  return created ?? null
}

async function ensureMembership(journalId: string, userId: string, role: 'handling_editor' | 'author' | 'journal_manager') {
  const [existing] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.journalId, journalId), eq(memberships.role, role)))
    .limit(1)
  if (existing) return
  await db.insert(memberships).values({ journalId, userId, role, scopeType: 'journal' })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
