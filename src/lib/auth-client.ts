'use client'

import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { Auth } from '@/server/auth/instance'

/**
 * Browser client for Better Auth. The server instance is imported as a type
 * only, so Postgres does not end up in the client bundle. The screens still
 * use the demo session in src/lib/session.tsx until they are pointed here.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
})
