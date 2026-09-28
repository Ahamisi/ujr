/**
 * Outbound mail. Until an email provider is configured, messages are written
 * to the server log so invitation links are recoverable in development.
 * The job runner calls this; request handlers enqueue a job instead.
 */

export interface OutboundEmail {
  to: string
  subject: string
  text: string
}

export async function deliverEmail(message: OutboundEmail) {
  if (!process.env.SMTP_URL) {
    console.info(`[email] to=${message.to} subject=${message.subject}\n${message.text}`)
    return
  }
  // A real transport belongs here (SMTP_URL). Failing closed is worse than
  // logging during setup, but production must not silently drop mail.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP_URL is set but no SMTP transport is implemented yet')
  }
  console.info(`[email] to=${message.to} subject=${message.subject}\n${message.text}`)
}
