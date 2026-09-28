import { getAuth } from '@/server/auth/instance'
import { databaseConfigured } from '@/db/client'

async function handle(request: Request) {
  if (!databaseConfigured() || !process.env.BETTER_AUTH_SECRET) {
    return Response.json(
      {
        error: {
          code: 'unconfigured',
          message: 'Set DATABASE_URL and BETTER_AUTH_SECRET before using authentication.',
        },
      },
      { status: 503 },
    )
  }
  return getAuth().handler(request)
}

export { handle as GET, handle as POST }
