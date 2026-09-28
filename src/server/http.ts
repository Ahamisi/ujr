import { toErrorResponse } from './errors'

type Params = Record<string, string | string[] | undefined>
type Handler = (req: Request, ctx: { params: Params }) => Promise<unknown>

/**
 * Thin route wrapper. Domain code throws AppError or ZodError; this is the
 * only place that knows about HTTP status codes.
 */
export function api(handler: Handler) {
  return async (req: Request, segment?: { params?: Promise<Params> }) => {
    try {
      const params = segment?.params ? await segment.params : {}
      const result = await handler(req, { params })
      if (result instanceof Response) return result
      return Response.json(result)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

export async function readJson(req: Request) {
  const text = await req.text()
  if (!text) return {}
  return JSON.parse(text) as unknown
}
