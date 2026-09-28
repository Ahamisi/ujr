import { api } from '@/server/http'
import { jobTick } from '@/server/http/journal-routes'

export const POST = api(async (req) => jobTick(req))
