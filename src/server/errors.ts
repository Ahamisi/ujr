import { ZodError } from 'zod'

/**
 * Every API failure is one of these. Routes do not catch domain errors
 * themselves; `api()` turns them into JSON. A missing row and a row in
 * another journal are both 404 — confirming that a manuscript exists is
 * itself a disclosure.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  unauthorized: (message = 'Sign in required') => new AppError(message, 401, 'unauthorized'),
  forbidden: (message = 'You do not have access to do that') => new AppError(message, 403, 'forbidden'),
  notFound: (what = 'Record') => new AppError(`${what} was not found`, 404, 'not_found'),
  conflict: (message: string) => new AppError(message, 409, 'conflict'),
  badRequest: (message: string) => new AppError(message, 400, 'bad_request'),
  gone: (message: string) => new AppError(message, 410, 'gone'),
  unconfigured: (message: string) => new AppError(message, 503, 'unconfigured'),
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: { code: 'invalid', message: 'The request body is not valid', issues: error.issues } },
      { status: 400 },
    )
  }
  console.error(error)
  return Response.json(
    { error: { code: 'internal', message: 'Something went wrong' } },
    { status: 500 },
  )
}
