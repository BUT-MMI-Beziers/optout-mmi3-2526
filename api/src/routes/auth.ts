import { Hono } from 'hono'
import type { AppVariables } from '../types.js'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { z } from 'zod'
import { pool } from '../lib/db.js'
import { redis } from '../lib/redis.js'
import { hashPassword, verifyPassword } from '../lib/hash.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TTL,
} from '../lib/jwt.js'
import { requireAuth } from '../middleware/requireAuth.js'

const auth = new Hono<{ Variables: AppVariables }>()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const IS_PROD = process.env.NODE_ENV === 'production'

function setAuthCookies(
  c: Parameters<typeof setCookie>[0],
  accessToken: string,
  refreshToken: string,
) {
  const base = {
    httpOnly: true,
    sameSite: 'Strict' as const,
    secure: IS_PROD,
    path: '/',
  }
  setCookie(c, 'access_token', accessToken, { ...base, maxAge: 60 * 15 })
  setCookie(c, 'refresh_token', refreshToken, {
    ...base,
    maxAge: REFRESH_TTL,
  })
}

function clearAuthCookies(c: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(c, 'access_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/' })
}

// POST /register
auth.post('/register', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400)
  }

  const { email, password } = parsed.data

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
    email,
  ])
  if (existing.rows.length > 0) {
    return c.json({ error: 'Email already in use' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email, passwordHash],
  )
  const user = result.rows[0] as { id: string; email: string }

  const tokenId = crypto.randomUUID()
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.email),
    signRefreshToken(user.id, tokenId),
  ])

  await redis.set(`refresh_token:${tokenId}`, user.id, 'EX', REFRESH_TTL)

  setAuthCookies(c, accessToken, refreshToken)

  return c.json({ user: { id: user.id, email: user.email } }, 201)
})

// POST /login
auth.post('/login', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400)
  }

  const { email, password } = parsed.data

  const result = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email],
  )
  const user = result.rows[0] as
    | { id: string; email: string; password_hash: string }
    | undefined

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const tokenId = crypto.randomUUID()
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id, user.email),
    signRefreshToken(user.id, tokenId),
  ])

  await redis.set(`refresh_token:${tokenId}`, user.id, 'EX', REFRESH_TTL)

  setAuthCookies(c, accessToken, refreshToken)

  return c.json({ user: { id: user.id, email: user.email } })
})

// POST /logout
auth.post('/logout', requireAuth, async (c) => {
  const rawRefresh = getCookie(c, 'refresh_token')
  if (rawRefresh) {
    try {
      const payload = await verifyRefreshToken(rawRefresh)
      await redis.del(`refresh_token:${payload.jti}`)
    } catch {
      // token already invalid, proceed
    }
  }

  clearAuthCookies(c)
  return c.json({ message: 'Logged out' })
})

// POST /refresh
auth.post('/refresh', async (c) => {
  const rawRefresh = getCookie(c, 'refresh_token')
  if (!rawRefresh) {
    return c.json({ error: 'No refresh token' }, 401)
  }

  let payload: Awaited<ReturnType<typeof verifyRefreshToken>>
  try {
    payload = await verifyRefreshToken(rawRefresh)
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }

  const storedUserId = await redis.get(`refresh_token:${payload.jti}`)
  if (!storedUserId || storedUserId !== payload.sub) {
    return c.json({ error: 'Refresh token revoked' }, 401)
  }

  const result = await pool.query(
    'SELECT id, email FROM users WHERE id = $1',
    [payload.sub],
  )
  const user = result.rows[0] as { id: string; email: string } | undefined
  if (!user) {
    return c.json({ error: 'User not found' }, 401)
  }

  // Rotate: delete old, issue new
  await redis.del(`refresh_token:${payload.jti}`)
  const newTokenId = crypto.randomUUID()
  const [newAccess, newRefresh] = await Promise.all([
    signAccessToken(user.id, user.email),
    signRefreshToken(user.id, newTokenId),
  ])
  await redis.set(`refresh_token:${newTokenId}`, user.id, 'EX', REFRESH_TTL)

  setAuthCookies(c, newAccess, newRefresh)
  return c.json({ user: { id: user.id, email: user.email } })
})

// GET /me
auth.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId') as string
  const result = await pool.query(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [userId],
  )
  const user = result.rows[0] as
    | { id: string; email: string; created_at: string }
    | undefined
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }
  return c.json({ user })
})

// PUT /me/password
auth.put('/me/password', requireAuth, async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400)
  }

  const userId = c.get('userId') as string
  const { currentPassword, newPassword } = parsed.data

  const result = await pool.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId],
  )
  const user = result.rows[0] as { password_hash: string } | undefined
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    return c.json({ error: 'Current password is incorrect' }, 400)
  }

  const newHash = await hashPassword(newPassword)
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, userId],
  )

  return c.json({ message: 'Password updated' })
})

// GET /csrf  (permet au frontend d'obtenir le token CSRF initial)
auth.get('/csrf', (c) => {
  const token = getCookie(c, '_csrf') ?? ''
  return c.json({ csrfToken: token })
})

export default auth
