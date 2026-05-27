import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { JWTPayload } from './auth.types.js'

// ── JWT authMiddleware ──────────────────────────────────────────────────────
// Vérifie le Bearer token dans Authorization, injecte userId + userRole dans
// le contexte Hono. Retourne 401 si absent ou invalide.
// Réutilisable par tous les modules : import { authMiddleware } from '../auth/auth.middleware.js'

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('JWT_SECRET is not configured')
    return c.json({ error: 'Internal server error' }, 500)
  }

  try {
    const payload = await verify(token, secret, 'HS256') as unknown as JWTPayload
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})

// ── loginRateLimiter ────────────────────────────────────────────────────────
// Protection brute-force sur les endpoints login/register.
// Implémentation in-memory : 5 tentatives max par IP sur 15 minutes.

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
