import { manuscriptStatus } from '@/db/schema'
import { withJournal } from '@/db/tenant'
import {
  applyPaystackEvent,
} from '@/server/charges/service'
import {
  attachPaystackReference,
  listCharges,
  markRefunded,
  startCheckout,
  waiveCharge,
  waiveInput,
} from '@/server/charges/service'
import { verifyPaystackSignature, type PaystackEvent } from '@/server/charges/paystack'
import { inJournal, journalContext, requireActor, findJournalBySlug, type JournalCtx } from '@/server/context'
import { decisionInput, draftDecisionLetter, recordDecision } from '@/server/decisions/service'
import { Errors } from '@/server/errors'
import { fileKindInput, fileResponse, markScrubbed, readAssignedManuscript, readForAuthor, readForStaff, registerUpload, removeStoredFile } from '@/server/files/service'
import { api, readJson } from '@/server/http'
import {
  addEditorNote,
  addReviewerNote,
  deleteEditorNote,
  deleteReviewerNote,
  editEditorNote,
  editReviewerNote,
  listEditorNotes,
  listReviewerNotes,
  noteEditInput,
  noteInput,
  uploadReviewerFile,
} from '@/server/annotations/service'
import { ensureInstitution, listInstitutions } from '@/server/institutions/service'
import { grantInput, grantRole, listPeople, revokeRole } from '@/server/people/service'
import { ensureSection, joinAsAuthor, listSections, myJournals } from '@/server/journals/service'
import { ensureReminderSweep, processDueJobs } from '@/server/jobs/service'
import type { ManuscriptStatus } from '@/lib/types'
import {
  assignEditor,
  assignEditorInput,
  createDraft,
  createDraftInput,
  deleteDraft,
  updateDraft,
  updateDraftInput,
  editorTransition,
  getManuscript,
  listDesk,
  listJournalManuscripts,
  listMine,
  loadManuscript,
  resubmit,
  submitInput,
  submitManuscript,
  transitionInput,
} from '@/server/manuscripts/service'
import { isManuscriptAuthor, findGrant, ROLE_GROUPS } from '@/server/authz'
import { listNotifications, markNotificationRead } from '@/server/notifications/service'
import {
  advanceProduction,
  createIssue,
  createIssueInput,
  getPublished,
  listDoiRegistry,
  listIssues,
  listProduction,
  listPublished,
  mintManuscriptDoi,
  productionInput,
  queueCrossrefDeposit,
  searchPublished,
} from '@/server/publishing/service'
import { journalReport } from '@/server/reports/service'
import { inviteInput, inviteReviewer, listMyAssignments, openInvitation, remindReviewers, respondInput, respondToInvitation, submitReview, submitReviewInput } from '@/server/reviews/service'
import { hashToken } from '@/server/auth/tokens'
import { withReviewToken } from '@/db/tenant'
import { addReviewer, listReviewers } from '@/server/reviewers/service'
import { getSettings, saveSettings } from '@/server/settings/service'
import { journalPolicySchema, resolvePolicy } from '@/db/policy'
import { safeEqual } from '@/server/auth/tokens'
import { z } from 'zod'

function parts(params: { path?: string | string[] }) {
  if (!params.path) return []
  return Array.isArray(params.path) ? params.path : [params.path]
}

function asStatus(value: string): ManuscriptStatus {
  const allowed = manuscriptStatus.enumValues as readonly string[]
  if (!allowed.includes(value)) throw Errors.badRequest(`Unknown status ${value}`)
  return value as ManuscriptStatus
}

async function staffFile(ctx: JournalCtx, fileId: string) {
  const { withJournal: tenant } = await import('@/db/tenant')
  return tenant(ctx.journal.id, async (tx) => {
    const { files } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')
    const [file] = await tx.select().from(files).where(and(eq(files.id, fileId), eq(files.journalId, ctx.journal.id))).limit(1)
    if (!file?.manuscriptId) throw Errors.notFound('File')
    const manuscript = await loadManuscript(tx, ctx.journal.id, file.manuscriptId)
    if (!manuscript) throw Errors.notFound('File')
    if (await isManuscriptAuthor(tx, manuscript, ctx.actor.userId)) return readForAuthor(tx, fileId, ctx.journal.id)
    const grant = await findGrant(tx, ctx.actor.userId, ctx.journal.id, ROLE_GROUPS.staff, {
      sectionId: manuscript.sectionId,
      issueId: manuscript.issueId,
    })
    if (!grant) throw Errors.notFound('File')
    return readForStaff(tx, fileId, ctx.journal.id)
  })
}

export const GET = api(async (req, { params }) => {
  const slug = String(params.slug)
  const path = parts(params)

  if (path.length === 0) {
    const journal = await findJournalBySlug(slug)
    if (!journal || !journal.isActive) throw Errors.notFound('Journal')
    const policy = resolvePolicy(journal.policy)
    return {
      slug: journal.slug,
      name: journal.name,
      abbreviation: journal.abbreviation,
      issnPrint: journal.issnPrint,
      issnElectronic: journal.issnElectronic,
      doiPrefix: journal.doiPrefix,
      requiredDeclarations: policy.submission.requiredDeclarations,
      abstractWordLimit: policy.submission.abstractWordLimit,
      maxKeywords: policy.submission.maxKeywords,
      acceptedFileTypes: policy.submission.acceptedFileTypes,
      maxFileSizeMb: policy.submission.maxFileSizeMb,
    }
  }

  if (path[0] === 'institutions' && path.length === 1) {
    return listInstitutions(new URL(req.url).searchParams.get('q') ?? '')
  }

  if (path[0] === 'articles' && path.length === 1) return publishedWithoutSession(req, slug)
  if (path[0] === 'articles' && path.length === 2) {
    const journal = await findJournalBySlug(slug)
    if (!journal) throw Errors.notFound('Journal')
    return withJournal(journal.id, (tx) => getPublished(tx, journal.id, path[1]))
  }

  const ctx = await journalContext(req, slug)

  if (path[0] === 'desk' && path.length === 1) {
    return inJournal(ctx, 'editorial', (tx, grant) => listDesk(tx, ctx.journal.id, grant))
  }
  if (path[0] === 'manuscripts' && path.length === 1) {
    return inJournal(ctx, 'editorial', (tx, grant) => listJournalManuscripts(tx, ctx.journal.id, grant))
  }
  if (path[0] === 'mine' && path.length === 1) {
    return inJournal(ctx, 'author', (tx) => listMine(tx, ctx.journal.id, ctx.actor.userId))
  }
  if (path[0] === 'manuscripts' && path.length === 2) {
    return withJournal(ctx.journal.id, (tx) => getManuscript(tx, ctx, path[1]))
  }
  if (path[0] === 'manuscripts' && path[2] === 'annotations' && path.length === 3) {
    return inJournal(ctx, 'editorial', (tx) => listEditorNotes(tx, ctx, path[1]))
  }
  if (path[0] === 'files' && path.length === 2) {
    const result = await staffFile(ctx, path[1])
    return fileResponse(result.file, result.bytes, new URL(req.url).searchParams.get('inline') === '1')
  }
  if (path[0] === 'settings' && path.length === 1) {
    return inJournal(ctx, 'settings', (tx) => getSettings(tx, ctx.journal))
  }
  if (path[0] === 'people' && path.length === 1) {
    return inJournal(ctx, 'settings', (tx) => listPeople(tx, ctx.journal.id))
  }
  if (path[0] === 'charges' && path.length === 1) {
    return inJournal(ctx, 'finance', (tx) => listCharges(tx, ctx.journal.id))
  }
  if (path[0] === 'issues' && path.length === 1) {
    return inJournal(ctx, 'editorial', (tx) => listIssues(tx, ctx.journal.id))
  }
  if (path[0] === 'production' && path.length === 1) {
    return inJournal(ctx, 'production', (tx) => listProduction(tx, ctx.journal.id))
  }
  if (path[0] === 'doi' && path.length === 1) {
    return inJournal(ctx, 'production', (tx) => listDoiRegistry(tx, ctx.journal.id))
  }
  if (path[0] === 'reports' && path.length === 1) {
    return inJournal(ctx, 'editorial', (tx) => journalReport(tx, ctx.journal.id))
  }
  if (path[0] === 'reviewers' && path.length === 1) {
    return inJournal(ctx, 'editorial', (tx) => listReviewers(tx, ctx.journal.id))
  }
  if (path[0] === 'sections' && path.length === 1) {
    return inJournal(ctx, 'author', (tx) => listSections(tx, ctx.journal.id))
  }
  if (path[0] === 'assignments' && path.length === 1) {
    return inJournal(ctx, 'member', (tx) => listMyAssignments(tx, ctx.journal.id, ctx.actor.userId))
  }
  if (path[0] === 'notifications' && path.length === 1) {
    return inJournal(ctx, 'member', (tx) => listNotifications(tx, ctx.journal.id, ctx.actor.userId))
  }
  throw Errors.notFound('Route')
})

export const POST = api(async (req, { params }) => {
  const slug = String(params.slug)
  const path = parts(params)
  const ctx = await journalContext(req, slug)

  if (path[0] === 'manuscripts' && path.length === 1) {
    const body = createDraftInput.parse(await readJson(req))
    return inJournal(ctx, 'author', (tx) => createDraft(tx, ctx, body), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'submit' && path.length === 3) {
    const body = submitInput.parse(await readJson(req))
    return inJournal(ctx, 'author', (tx) => submitManuscript(tx, ctx, path[1], body), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'resubmit' && path.length === 3) {
    return inJournal(ctx, 'author', (tx) => resubmit(tx, ctx, path[1]), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'transition' && path.length === 3) {
    const body = transitionInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx, grant) => editorTransition(tx, ctx, grant, path[1], asStatus(body.to), body.reason), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'assign' && path.length === 3) {
    const body = assignEditorInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => assignEditor(tx, ctx, path[1], body.editorId), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'remind' && path.length === 3) {
    return inJournal(ctx, 'editorial', (tx) => remindReviewers(tx, ctx, path[1]), { write: true })
  }
  if (path[0] === 'people' && path.length === 1) {
    return grantRole(ctx, grantInput.parse(await readJson(req)))
  }
  if (path[0] === 'reviewers' && path.length === 1) {
    const body = z
      .object({
        name: z.string().min(2).max(200),
        email: z.string().email(),
        affiliation: z.string().min(2).max(200),
        expertise: z.array(z.string().min(1).max(80)).max(20),
      })
      .parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => addReviewer(tx, ctx, body), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'annotations' && path.length === 3) {
    const body = noteInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => addEditorNote(tx, ctx, path[1], body), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'invitations' && path.length === 3) {
    const body = inviteInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => inviteReviewer(tx, ctx, path[1], body), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'decisions' && path[3] === 'draft' && path.length === 4) {
    const body = z.object({ decision: decisionInput.shape.decision }).parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => draftDecisionLetter(tx, ctx, path[1], body.decision))
  }
  if (path[0] === 'manuscripts' && path[2] === 'decisions' && path.length === 3) {
    const body = decisionInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => recordDecision(tx, ctx, path[1], body), { write: true })
  }
  if (path[0] === 'manuscripts' && path[2] === 'files' && path.length === 3) {
    const form = await req.formData()
    const upload = form.get('file')
    const kind = fileKindInput.parse(form.get('kind') ?? 'manuscript')
    if (!(upload instanceof File)) throw Errors.badRequest('Attach the file as "file"')
    const bytes = Buffer.from(await upload.arrayBuffer())
    const uploaded = await withJournal(ctx.journal.id, async (tx) => {
      const manuscript = await loadManuscript(tx, ctx.journal.id, path[1])
      if (!manuscript) throw Errors.notFound('Manuscript')
      const author = await isManuscriptAuthor(tx, manuscript, ctx.actor.userId)
      const editor = await findGrant(tx, ctx.actor.userId, ctx.journal.id, ROLE_GROUPS.editorial, {
        sectionId: manuscript.sectionId,
        issueId: manuscript.issueId,
      })
      if (!author && !editor) throw Errors.notFound('Manuscript')
      const { files, sections } = await import('@/db/schema')
      const { and, eq, inArray, ne } = await import('drizzle-orm')
      const [section] = manuscript.sectionId
        ? await tx.select().from(sections).where(eq(sections.id, manuscript.sectionId)).limit(1)
        : []
      const created = await registerUpload(tx, {
        journal: ctx.journal,
        manuscript,
        section: section ?? null,
        actorId: ctx.actor.userId,
        kind,
        originalName: upload.name,
        mimeType: upload.type,
        bytes,
      })
      let removedKeys: string[] = []
      if (form.get('replace') === 'true' && manuscript.status === 'draft' && kind === 'manuscript') {
        const older = await tx
          .select({ id: files.id, storageKey: files.storageKey })
          .from(files)
          .where(and(eq(files.manuscriptId, manuscript.id), eq(files.kind, 'manuscript'), ne(files.id, created.id)))
        if (older.length > 0) {
          await tx.delete(files).where(inArray(files.id, older.map((row) => row.id)))
          removedKeys = older.map((row) => row.storageKey)
        }
      }
      return { file: created, removedKeys }
    })
    await Promise.all(uploaded.removedKeys.map((key) => removeStoredFile(key)))
    return uploaded.file
  }
  if (path[0] === 'files' && path[2] === 'scrubbed' && path.length === 3) {
    return inJournal(
      ctx,
      'editorial',
      (tx) => markScrubbed(tx, path[1], ctx.journal.id, ctx.actor.userId, ctx.meta.ipAddress),
      { write: true },
    )
  }
  if (path[0] === 'charges' && path[2] === 'waive' && path.length === 3) {
    const body = waiveInput.parse(await readJson(req))
    return inJournal(ctx, 'finance', (tx) => waiveCharge(tx, {
      journalId: ctx.journal.id,
      chargeId: path[1],
      actorId: ctx.actor.userId,
      reason: body.reason,
      ipAddress: ctx.meta.ipAddress,
    }), { write: true })
  }
  if (path[0] === 'charges' && path[2] === 'refund' && path.length === 3) {
    const body = waiveInput.parse(await readJson(req))
    return inJournal(ctx, 'finance', (tx) => markRefunded(tx, {
      journalId: ctx.journal.id,
      chargeId: path[1],
      actorId: ctx.actor.userId,
      reason: body.reason,
      ipAddress: ctx.meta.ipAddress,
    }), { write: true })
  }
  if (path[0] === 'charges' && path[2] === 'checkout' && path.length === 3) {
    const charge = await inJournal(ctx, 'author', (tx) => attachPaystackReference(tx, { journalId: ctx.journal.id, chargeId: path[1] }), { write: true })
    if (!charge.paystackReference) throw Errors.conflict('Could not attach a payment reference')
    return startCheckout({
      email: ctx.actor.email,
      charge: {
        id: charge.id,
        amountMinor: charge.amountMinor,
        paystackReference: charge.paystackReference,
        manuscriptId: charge.manuscriptId,
        journalId: charge.journalId,
      },
    })
  }
  if (path[0] === 'sections' && path.length === 1) {
    const body = z.object({ name: z.string().min(2).max(120) }).parse(await readJson(req))
    return inJournal(ctx, 'author', (tx) => ensureSection(tx, ctx.journal.id, body.name), { write: true })
  }
  if (path[0] === 'institutions' && path.length === 1) {
    const body = z.object({ name: z.string().min(2).max(200), count: z.boolean().optional() }).parse(await readJson(req))
    return ensureInstitution(body.name, body.count === true)
  }
  if (path[0] === 'issues' && path.length === 1) {
    const body = createIssueInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => createIssue(tx, ctx, body), { write: true })
  }
  if (path[0] === 'production' && path.length === 1) {
    const body = productionInput.parse(await readJson(req))
    return inJournal(ctx, 'production', (tx) => advanceProduction(tx, ctx, body), { write: true })
  }
  if (path[0] === 'doi' && path[1] === 'mint' && path.length === 3) {
    return inJournal(ctx, 'production', (tx) => mintManuscriptDoi(tx, ctx, path[2]), { write: true })
  }
  if (path[0] === 'doi' && path[1] === 'deposit' && path.length === 3) {
    return inJournal(ctx, 'production', (tx) => queueCrossrefDeposit(tx, ctx, path[2]), { write: true })
  }
  if (path[0] === 'notifications' && path[2] === 'read' && path.length === 3) {
    return inJournal(ctx, 'member', async (tx) => {
      const row = await markNotificationRead(tx, ctx.journal.id, ctx.actor.userId, path[1])
      if (!row) throw Errors.notFound('Notification')
      return row
    })
  }
  throw Errors.notFound('Route')
})

export const PUT = api(async (req, { params }) => {
  const path = parts(params)
  const ctx = await journalContext(req, String(params.slug))
  if (path[0] === 'settings' && path.length === 1) {
    const body = journalPolicySchema.parse(await readJson(req))
    return inJournal(ctx, 'settings', (tx) => saveSettings(tx, ctx, body), { write: true })
  }
  if (path[0] === 'manuscripts' && path.length === 2) {
    const body = updateDraftInput.parse(await readJson(req))
    return inJournal(ctx, 'author', (tx) => updateDraft(tx, ctx, path[1], body), { write: true })
  }
  if (path[0] === 'annotations' && path.length === 2) {
    const body = noteEditInput.parse(await readJson(req))
    return inJournal(ctx, 'editorial', (tx) => editEditorNote(tx, ctx, path[1], body.body), { write: true })
  }
  throw Errors.notFound('Route')
})

export const DELETE = api(async (req, { params }) => {
  const path = parts(params)
  const ctx = await journalContext(req, String(params.slug))
  if (path[0] === 'annotations' && path.length === 2) {
    return inJournal(ctx, 'editorial', (tx) => deleteEditorNote(tx, ctx, path[1]), { write: true })
  }
  if (path[0] === 'people' && path.length === 3) {
    return inJournal(ctx, 'settings', (tx) => revokeRole(tx, ctx, path[1], path[2]), { write: true })
  }
  if (path[0] === 'manuscripts' && path.length === 2) {
    const removed = await inJournal(ctx, 'author', (tx) => deleteDraft(tx, ctx, path[1]), { write: true })
    await Promise.all(removed.storageKeys.map((key) => removeStoredFile(key)))
    return { id: removed.id }
  }
  throw Errors.notFound('Route')
})

export const reviewGET = api(async (req, { params }) => {
  const token = String(params.token)
  const path = parts(params)
  if (path.length === 0) return openInvitation(token)
  if (path[0] === 'annotations' && path.length === 1) return listReviewerNotes(token)
  if (path[0] === 'files' && path.length === 2) {
    const tokenHash = hashToken(token)
    const result = await withReviewToken(tokenHash, async (tx) => {
      const { reviewAssignments } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')
      const [assignment] = await tx.select().from(reviewAssignments).where(eq(reviewAssignments.accessTokenHash, tokenHash)).limit(1)
      if (!assignment) throw Errors.notFound('Invitation')
      return readAssignedManuscript(tx, path[1], assignment.journalId, assignment.manuscriptId)
    })
    return fileResponse(result.file, result.bytes, new URL(req.url).searchParams.get('inline') === '1')
  }
  throw Errors.notFound('Route')
})

export const reviewPOST = api(async (req, { params }) => {
  const token = String(params.token)
  const path = parts(params)
  if (path[0] === 'respond' && path.length === 1) return respondToInvitation(token, respondInput.parse(await readJson(req)))
  if (path[0] === 'submit' && path.length === 1) return submitReview(token, submitReviewInput.parse(await readJson(req)))
  if (path[0] === 'annotations' && path.length === 1) return addReviewerNote(token, noteInput.parse(await readJson(req)))
  if (path[0] === 'files' && path.length === 1) {
    const form = await req.formData()
    const upload = form.get('file')
    if (!(upload instanceof File)) throw Errors.badRequest('Attach the file as "file"')
    const saved = await uploadReviewerFile(token, upload)
    return { id: saved.id, originalName: saved.originalName }
  }
  throw Errors.notFound('Route')
})

export const reviewPUT = api(async (req, { params }) => {
  const token = String(params.token)
  const path = parts(params)
  if (path[0] === 'annotations' && path.length === 2) {
    const body = noteEditInput.parse(await readJson(req))
    return editReviewerNote(token, path[1], body.body)
  }
  throw Errors.notFound('Route')
})

export const reviewDELETE = api(async (req, { params }) => {
  void req
  const token = String(params.token)
  const path = parts(params)
  if (path[0] === 'annotations' && path.length === 2) return deleteReviewerNote(token, path[1])
  throw Errors.notFound('Route')
})

export async function paystackWebhook(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) throw Errors.unconfigured('PAYSTACK_SECRET_KEY is not set')
  const raw = await req.text()
  if (!verifyPaystackSignature(raw, req.headers.get('x-paystack-signature'), secret)) {
    throw Errors.unauthorized('Invalid Paystack signature')
  }
  return applyPaystackEvent(JSON.parse(raw) as PaystackEvent)
}

export async function jobTick(req: Request) {
  const secret = process.env.JOB_SECRET
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!secret || !safeEqual(token, secret)) throw Errors.unauthorized()
  await ensureReminderSweep()
  return processDueJobs()
}

export async function me(req: Request) {
  const actor = await requireActor(req)
  const journals = await myJournals(actor.userId)
  return { user: actor, memberships: journals }
}

export async function join(req: Request) {
  const actor = await requireActor(req)
  const body = z.object({ slug: z.string().min(1) }).parse(await readJson(req))
  return joinAsAuthor(actor.userId, body.slug)
}

export async function publishedWithoutSession(req: Request, slug: string) {
  const journal = await findJournalBySlug(slug)
  if (!journal || !journal.isActive) throw Errors.notFound('Journal')
  const q = new URL(req.url).searchParams.get('q')
  return withJournal(journal.id, (tx) => (q ? searchPublished(tx, journal.id, q) : listPublished(tx, journal.id)))
}
