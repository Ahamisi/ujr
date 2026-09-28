import { createHmac } from 'node:crypto'
import { safeEqual } from '@/server/auth/tokens'

/** Paystack signs the raw body with HMAC SHA512 of the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const digest = createHmac('sha512', secret).update(rawBody).digest('hex')
  return safeEqual(digest, signature)
}

export interface PaystackEvent {
  event: string
  data: {
    reference?: string
    status?: string
    channel?: string
  }
}

export async function initializePaystack(input: {
  email: string
  amountMinor: number
  reference: string
  metadata: Record<string, string>
}) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not set')
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      reference: input.reference,
      metadata: input.metadata,
    }),
  })
  const body = (await response.json()) as {
    status?: boolean
    message?: string
    data?: { authorization_url?: string; reference?: string }
  }
  if (!response.ok || !body.status || !body.data?.authorization_url) {
    throw new Error(body.message || 'Paystack did not start the transaction')
  }
  return { authorizationUrl: body.data.authorization_url, reference: body.data.reference ?? input.reference }
}
