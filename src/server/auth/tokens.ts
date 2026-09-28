import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** 32 bytes, base64url. The database stores sha256(token), never the token. */
export function newReviewerToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
