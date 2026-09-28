import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Tx } from '@/db/client'
import type { FrozenPolicy } from '@/db/policy'
import { charges, manuscriptAuthors, manuscripts, users } from '@/db/schema'
import { audit } from '@/server/audit'
import { Errors } from '@/server/errors'
import { notify } from '@/server/notifications/service'
import { withPaystackReference } from '@/db/tenant'
import { initializePaystack, type PaystackEvent } from './paystack'

type Manuscript = typeof manuscripts.$inferSelect

/**
 * Raise the charge the frozen policy calls for, once. A later change to the
 * journal's fees does not create a second charge and does not alter this one.
 * Amount zero, or trigger `none`, raises nothing.
 */
export async function maybeRaiseCharge(
  tx: Tx,
  input: { manuscript: Manuscript; trigger: FrozenPolicy['policy']['fees']['trigger']; actorId: string },
) {
  const policy = input.manuscript.policySnapshot?.policy
  if (!policy || policy.fees.trigger !== input.trigger || policy.fees.amountMinor <= 0) return null

  const [existing] = await tx
    .select()
    .from(charges)
    .where(eq(charges.manuscriptId, input.manuscript.id))
    .limit(1)
  if (existing) return existing

  const [corresponding] = await tx
    .select({ country: users.country, email: manuscriptAuthors.email, userId: manuscriptAuthors.userId })
    .from(manuscriptAuthors)
    .leftJoin(users, eq(users.id, manuscriptAuthors.userId))
    .where(and(eq(manuscriptAuthors.manuscriptId, input.manuscript.id), eq(manuscriptAuthors.isCorresponding, true)))
    .limit(1)

  const country = corresponding?.country ?? ''
  const autoWaive = country.length === 2 && policy.fees.autoWaiveCountries.includes(country)

  const [charge] = await tx
    .insert(charges)
    .values({
      journalId: input.manuscript.journalId,
      manuscriptId: input.manuscript.id,
      amountMinor: policy.fees.amountMinor,
      currency: policy.fees.currency,
      status: autoWaive ? 'waived' : 'pending',
      waiverReason: autoWaive ? `Automatic waiver for country ${country}` : null,
    })
    .returning()

  await audit(tx, {
    journalId: input.manuscript.journalId,
    actorId: input.actorId,
    action: autoWaive ? 'charge.waived_auto' : 'charge.raised',
    entityType: 'charge',
    entityId: charge.id,
    metadata: { amountMinor: charge.amountMinor, currency: charge.currency, trigger: input.trigger },
  })

  if (corresponding?.userId) {
    await notify(tx, {
      journalId: input.manuscript.journalId,
      userId: corresponding.userId,
      email: corresponding.email,
      kind: 'payment',
      title: autoWaive ? `Fee waived for ${input.manuscript.reference}` : `Fee due for ${input.manuscript.reference}`,
      body: autoWaive
        ? 'The article fee was waived under the policy in force when you submitted.'
        : 'An article fee is due. The amount was fixed when you submitted.',
      href: `/my-submissions/${input.manuscript.id}`,
    })
  }
  return charge
}

export async function listCharges(tx: Tx, journalId: string) {
  return tx
    .select({
      id: charges.id,
      manuscriptId: charges.manuscriptId,
      reference: manuscripts.reference,
      title: manuscripts.title,
      amountMinor: charges.amountMinor,
      currency: charges.currency,
      status: charges.status,
      channel: charges.channel,
      paystackReference: charges.paystackReference,
      waiverReason: charges.waiverReason,
      paidAt: charges.paidAt,
      createdAt: charges.createdAt,
    })
    .from(charges)
    .innerJoin(manuscripts, eq(manuscripts.id, charges.manuscriptId))
    .where(eq(charges.journalId, journalId))
    .orderBy(desc(charges.createdAt))
}

export const waiveInput = z.object({ reason: z.string().min(8).max(2000) })

export async function waiveCharge(tx: Tx, input: { journalId: string; chargeId: string; actorId: string; reason: string; ipAddress: string | null }) {
  const [charge] = await tx
    .select()
    .from(charges)
    .where(and(eq(charges.id, input.chargeId), eq(charges.journalId, input.journalId)))
    .limit(1)
  if (!charge) throw Errors.notFound('Charge')
  if (charge.status === 'paid') throw Errors.conflict('A paid charge cannot be waived. Record a refund instead.')
  if (charge.status === 'waived') return charge

  const [updated] = await tx
    .update(charges)
    .set({ status: 'waived', waivedById: input.actorId, waiverReason: input.reason })
    .where(eq(charges.id, charge.id))
    .returning()
  await audit(tx, {
    journalId: input.journalId,
    actorId: input.actorId,
    action: 'charge.waived',
    entityType: 'charge',
    entityId: charge.id,
    metadata: { reason: input.reason },
    ipAddress: input.ipAddress,
  })
  return updated
}

export async function markRefunded(tx: Tx, input: { journalId: string; chargeId: string; actorId: string; reason: string; ipAddress: string | null }) {
  const [charge] = await tx
    .select()
    .from(charges)
    .where(and(eq(charges.id, input.chargeId), eq(charges.journalId, input.journalId)))
    .limit(1)
  if (!charge) throw Errors.notFound('Charge')
  if (charge.status !== 'paid') throw Errors.conflict('Only a paid charge can be marked refunded')
  const [updated] = await tx.update(charges).set({ status: 'refunded' }).where(eq(charges.id, charge.id)).returning()
  await audit(tx, {
    journalId: input.journalId,
    actorId: input.actorId,
    action: 'charge.refunded',
    entityType: 'charge',
    entityId: charge.id,
    metadata: { reason: input.reason },
    ipAddress: input.ipAddress,
  })
  return updated
}

/**
 * Store our reference, commit happens in the caller's transaction, then the
 * route calls Paystack. The HTTP call is deliberately not inside the
 * transaction: a slow gateway must not hold a database connection open.
 */
export async function attachPaystackReference(tx: Tx, input: { journalId: string; chargeId: string }) {
  const [charge] = await tx
    .select()
    .from(charges)
    .where(and(eq(charges.id, input.chargeId), eq(charges.journalId, input.journalId)))
    .limit(1)
  if (!charge) throw Errors.notFound('Charge')
  if (charge.status !== 'pending') throw Errors.conflict('This charge is not awaiting payment')
  const reference = charge.paystackReference ?? `ujer_${charge.id.replaceAll('-', '')}`
  if (!charge.paystackReference) {
    await tx.update(charges).set({ paystackReference: reference }).where(eq(charges.id, charge.id))
  }
  return { ...charge, paystackReference: reference }
}

export async function startCheckout(input: { email: string; charge: { id: string; amountMinor: number; paystackReference: string; manuscriptId: string; journalId: string } }) {
  return initializePaystack({
    email: input.email,
    amountMinor: input.charge.amountMinor,
    reference: input.charge.paystackReference,
    metadata: { chargeId: input.charge.id, manuscriptId: input.charge.manuscriptId, journalId: input.charge.journalId },
  })
}

/** Idempotent. A second `charge.success` for a paid row is a 200 no-op. */
export async function applyPaystackEvent(event: PaystackEvent) {
  const reference = event.data.reference
  if (!reference) throw Errors.badRequest('Paystack event has no reference')
  return withPaystackReference(reference, async (tx) => {
    const [charge] = await tx.select().from(charges).where(eq(charges.paystackReference, reference)).limit(1)
    if (!charge) throw Errors.notFound('Charge')
    if (event.event === 'charge.success' && event.data.status === 'success') {
      if (charge.status === 'paid') return { ok: true, duplicate: true }
      await tx
        .update(charges)
        .set({ status: 'paid', paidAt: new Date(), channel: event.data.channel ?? null })
        .where(eq(charges.id, charge.id))
      await audit(tx, {
        journalId: charge.journalId,
        action: 'charge.paid',
        entityType: 'charge',
        entityId: charge.id,
        metadata: { reference, channel: event.data.channel ?? null },
      })
      return { ok: true }
    }
    if (event.event === 'charge.failed' && charge.status === 'pending') {
      await tx.update(charges).set({ status: 'failed' }).where(eq(charges.id, charge.id))
    }
    return { ok: true }
  })
}
