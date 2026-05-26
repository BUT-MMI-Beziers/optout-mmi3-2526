import type { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function csrfMiddleware(c: Context, next: Next) {
  let csrfToken = getCookie(c, '_csrf')

  if (!csrfToken) {
    csrfToken = crypto.randomUUID()
    setCookie(c, '_csrf', csrfToken, {
      httpOnly: false,
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  }

  if (MUTATING_METHODS.has(c.req.method)) {
    const headerToken = c.req.header('X-CSRF-Token')
    if (!headerToken || headerToken !== csrfToken) {
      return c.json({ error: 'Invalid CSRF token' }, 403)
    }
  }

  await next()
}
