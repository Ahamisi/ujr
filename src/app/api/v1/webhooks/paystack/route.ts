import { api } from '@/server/http'
import { paystackWebhook } from '@/server/http/journal-routes'

export const POST = api(async (req) => paystackWebhook(req))
