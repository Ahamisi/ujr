import { api } from '@/server/http'
import { join, me } from '@/server/http/journal-routes'

export const GET = api(async (req) => me(req))
export const POST = api(async (req) => join(req))
