// Rôle : regroupe les trois middlewares Hono du module auth.
// authMiddleware — vérifie le JWT (cookie HttpOnly accessToken) et injecte userId + userRole.
// loginRateLimiter — anti brute-force : 5 tentatives max par IP sur 15 minutes.
// adminGuard — bloque avec 403 si le rôle n'est pas admin.
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { JWTPayload } from './auth.types.js'

// ── authMiddleware ──────────────────────────────────────────────────────────
// Lit le JWT dans le cookie HttpOnly `accessToken`.
// Si valide, injecte userId et userRole dans le contexte Hono.
// Retourne 401 si le cookie est absent, malformé ou expiré.
export const authMiddleware = createMiddleware(async (c, next) => {
  const token = getCookieValue(c.req.header('Cookie'), 'accessToken')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('JWT_SECRET is not configured')
    return c.json({ error: 'Internal server error' }, 500)
  }

  try {
    const payload = await verify(token, secret, 'HS256') as unknown as JWTPayload
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
    c.set('sessionId', payload.sid ?? '')
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})

// ── adminGuard ──────────────────────────────────────────────────────────────
export const adminGuard = createMiddleware(async (c, next) => {
  if (c.get('userRole') !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})

// ── loginRateLimiter ────────────────────────────────────────────────────────
// Protection anti brute-force sur les endpoints login et register.
// 5 tentatives max par IP sur une fenêtre glissante de 15 minutes (in-memory).
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export const loginRateLimiter = createMiddleware(async (c, next) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown'

  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (record) {
    if (now >= record.resetAt) {
      loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    } else if (record.count >= MAX_ATTEMPTS) {
      return c.json(
        { error: 'Too many attempts. Please try again in 15 minutes.' },
        429
      )
    } else {
      record.count++
    }
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  }

  await next()
})

// ── Utilitaire ──────────────────────────────────────────────────────────────

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}
