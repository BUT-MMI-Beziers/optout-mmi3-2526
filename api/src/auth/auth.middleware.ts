import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { JWTPayload } from './auth.types.js'

// ── authMiddleware ──────────────────────────────────────────────────────────
// Vérifie le token JWT dans le header Authorization (format : "Bearer <token>").
// Si valide, injecte userId et userRole dans le contexte Hono pour que les
// controllers puissent les lire avec c.get('userId') / c.get('userRole').
// Retourne 401 si le token est absent, malformé ou expiré.
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

// ── adminGuard ──────────────────────────────────────────────────────────────
// À utiliser après authMiddleware. Vérifie que l'utilisateur connecté a le rôle
// 'admin'. Retourne 403 sinon. L'équipe rouge peut l'importer pour protéger
// les routes write de leurs brokers (POST, PUT, DELETE, PATCH /verify, import, export).
export const adminGuard = createMiddleware(async (c, next) => {
  if (c.get('userRole') !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})

// ── loginRateLimiter ────────────────────────────────────────────────────────
// Protection anti brute-force sur les endpoints login et register.
// Stockage en mémoire (Map) : 5 tentatives max par adresse IP sur une fenêtre
// glissante de 15 minutes. Au-delà, renvoie 429 Too Many Requests.
// Note : le compteur se remet à zéro au redémarrage du serveur (in-memory).
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export const loginRateLimiter = createMiddleware(async (c, next) => {
  // Récupère l'IP réelle derrière le reverse proxy Caddy
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown'

  const now = Date.now()
  const record = loginAttempts.get(ip)

  if (record) {
    if (now >= record.resetAt) {
      // Fenêtre expirée : repart à 1
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
