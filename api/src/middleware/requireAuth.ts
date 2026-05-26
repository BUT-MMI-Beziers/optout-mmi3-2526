import type { Context, Next } from 'hono'
import type { AppVariables } from '../types.js'
import { getCookie } from 'hono/cookie'
import { verifyAccessToken } from '../lib/jwt.js'

export async function requireAuth(c: Context<{ Variables: AppVariables }>, next: Next) {
  const token = getCookie(c, 'access_token')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const payload = await verifyAccessToken(token)
    c.set('userId', payload.sub)
    c.set('userEmail', payload.email)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}
