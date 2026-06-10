import type { Context } from 'hono'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import { eq } from 'drizzle-orm'
import * as passkeyService from './passkey.service.js'
import * as authService from './auth.service.js'

const IS_PROD = process.env.NODE_ENV === 'production'

function buildCookie(name: string, value: string, maxAge: number): string {
  const parts = [`${name}=${value}`, `Max-Age=${maxAge}`, 'Path=/', 'HttpOnly', 'SameSite=Strict']
  if (IS_PROD) parts.push('Secure')
  return parts.join('; ')
}

function getClientIp(c: Context): string | undefined {
  return c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? c.req.header('x-real-ip') ?? undefined
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function startPasskeyRegistration(c: Context) {
  const userId: string = c.get('userId')
  const user = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user.length) return c.json({ error: 'Utilisateur introuvable' }, 404)

  try {
    const options = await passkeyService.startRegistration(userId, user[0].email)
    return c.json(options)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
}

export async function finishPasskeyRegistration(c: Context) {
  const userId: string = c.get('userId')
  const body = await c.req.json()
  const keyName: string | undefined = body._keyName
  const { _keyName: _ignore, ...response } = body

  try {
    await passkeyService.finishRegistration(userId, response, keyName)
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: String(e) }, 400)
  }
}

// ── Authentication ────────────────────────────────────────────────────────────

export async function startPasskeyAuthentication(c: Context) {
  const email = c.req.query('email')
  try {
    const options = await passkeyService.startAuthentication(email)
    return c.json(options)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
}

export async function finishPasskeyAuthentication(c: Context) {
  const body = await c.req.json()

  try {
    const user = await passkeyService.finishAuthentication(body)
    const session = await authService.createSession(user.id, getClientIp(c), c.req.header('user-agent'))
    const tokens = await authService.generateTokens(user.id, user.role, session.id)

    c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true })
    c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true })

    return c.json({ ok: true, firstName: user.firstName })
  } catch (e) {
    return c.json({ error: String(e) }, 401)
  }
}

// ── Manage passkeys ───────────────────────────────────────────────────────────

export async function listPasskeys(c: Context) {
  const userId: string = c.get('userId')
  const keys = await passkeyService.listPasskeys(userId)
  return c.json(keys)
}

export async function deletePasskey(c: Context) {
  const userId: string = c.get('userId')
  const passkeyId = c.req.param('id')
  const ok = await passkeyService.deletePasskey(passkeyId, userId)
  if (!ok) return c.json({ error: 'Introuvable ou non autorisé' }, 404)
  return c.json({ ok: true })
}
