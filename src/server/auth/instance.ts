import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { genericOAuth } from 'better-auth/plugins'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { accounts, sessions, users, verifications } from '@/db/schema'
import { deliverEmail } from './email'

/**
 * Identity only. Better Auth proves who the person is. What they may do in a
 * journal is a membership row, checked by authz.ts on every editorial request.
 * Reviewer invitation links are not sessions; they are hashed tokens on
 * review_assignments.
 *
 * The instance is built on first use so `next build` does not require
 * BETTER_AUTH_SECRET.
 */

function buildAuth() {
  const orcidReady = Boolean(process.env.ORCID_CLIENT_ID && process.env.ORCID_CLIENT_SECRET)

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    database: drizzleAdapter(db, {
      provider: 'pg',
      camelCase: true,
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    advanced: {
      database: { generateId: 'uuid' },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      sendResetPassword: async ({ user, url }) => {
        await deliverEmail({
          to: user.email,
          subject: 'Reset your password',
          text: `Reset your password:\n${url}\n`,
        })
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await deliverEmail({
          to: user.email,
          subject: 'Verify your email',
          text: `Verify your email:\n${url}\n`,
        })
      },
    },
    user: {
      additionalFields: {
        givenName: { type: 'string', required: true },
        familyName: { type: 'string', required: true },
        emailVerifiedAt: { type: 'date', required: false, input: false },
        orcid: { type: 'string', required: false },
        affiliation: { type: 'string', required: false },
        country: { type: 'string', required: false },
        expertise: { type: 'string[]', required: false, defaultValue: [] },
        sharedReviewerPool: { type: 'boolean', required: false, defaultValue: false },
        isSuspended: { type: 'boolean', required: false, input: false, defaultValue: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const given = typeof user.givenName === 'string' ? user.givenName : ''
            const family = typeof user.familyName === 'string' ? user.familyName : ''
            const name = user.name?.trim() || `${given} ${family}`.trim()
            return { data: { ...user, name } }
          },
        },
        update: {
          after: async (user) => {
            if (!user.emailVerified) return
            await db
              .update(users)
              .set({ emailVerifiedAt: new Date() })
              .where(and(eq(users.id, user.id), isNull(users.emailVerifiedAt)))
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [row] = await db
              .select({ isSuspended: users.isSuspended })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1)
            if (row?.isSuspended) {
              throw new APIError('FORBIDDEN', { message: 'This account is suspended' })
            }
            return { data: session }
          },
        },
      },
    },
    plugins: orcidReady
      ? [
          genericOAuth({
            config: [
              {
                providerId: 'orcid',
                clientId: process.env.ORCID_CLIENT_ID as string,
                clientSecret: process.env.ORCID_CLIENT_SECRET as string,
                discoveryUrl: 'https://orcid.org/.well-known/openid-configuration',
                scopes: ['openid'],
                pkce: true,
                mapProfileToUser: (profile) => {
                  const record = profile as Record<string, unknown>
                  const given = String(record.given_name ?? '')
                  const family = String(record.family_name ?? '')
                  const orcid = String(record.sub ?? profile.id ?? '')
                  return {
                    name: String(profile.name ?? `${given} ${family}`.trim()),
                    givenName: given || 'ORCID',
                    familyName: family || 'Researcher',
                    orcid: orcid || undefined,
                  }
                },
              },
            ],
          }),
        ]
      : [],
  })
}

export type Auth = ReturnType<typeof buildAuth>

let cached: Auth | undefined

export function getAuth() {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set')
  }
  if (!cached) cached = buildAuth()
  return cached
}
