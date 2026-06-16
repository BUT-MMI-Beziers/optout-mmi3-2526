import type { Context } from 'hono'
import * as totpService from './totp.service.js'
import * as authService from './auth.service.js'

// ── GET /auth/totp/setup ──────────────────────────────────────────────────────
// Génère un secret TOTP + retourne l'URI otpauth pour le QR et le code base32 manuel.
// Le secret N'EST PAS encore sauvegardé — seulement après vérification via /activate.

export async function setupTotp(c: Context) {
  const userId = c.get('userId')
  const user = await authService.findUserById(userId)
  if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)
  if (user.totpEnabled) return c.json({ error: '2FA déjà activée' }, 400)

  const secret = totpService.generateTotpSecret()
  const uri = totpService.getTotpUri(secret, user.email)

  return c.json({ secret, uri })
}

// ── POST /auth/totp/activate ──────────────────────────────────────────────────
// Vérifie le code TOTP avec le secret fourni, puis active la 2FA.

export async function activateTotp(c: Context) {
  const userId = c.get('userId')
  const body = await c.req.json<{ secret: string; code: string }>()

  if (!body.secret || !body.code) {
    return c.json({ error: 'secret et code sont requis' }, 400)
  }

  const ok = await totpService.activateTotp(userId, body.secret, body.code)
  if (!ok) return c.json({ error: 'Code incorrect' }, 400)

  return c.json({ message: '2FA activée avec succès' })
}

// ── DELETE /auth/totp ─────────────────────────────────────────────────────────
// Désactive la 2FA après vérification du code TOTP courant.

export async function deactivateTotp(c: Context) {
  const userId = c.get('userId')
  const body = await c.req.json<{ code: string }>()

  if (!body.code) return c.json({ error: 'code TOTP requis' }, 400)

  const user = await authService.findUserById(userId)
  if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)
  if (!user.totpEnabled || !user.totpSecret) return c.json({ error: '2FA non activée' }, 400)

  const valid = await totpService.verifyAndConsumeCounter(user.id, user.totpSecret, body.code)
  if (!valid) return c.json({ error: 'Code incorrect' }, 400)

  await totpService.deactivateTotp(userId)
  return c.json({ message: '2FA désactivée' })
}

// ── POST /auth/totp/challenge ─────────────────────────────────────────────────
// Échange le temp token + code TOTP contre les vrais cookies de session.

export async function solveChallenge(c: Context) {
  const body = await c.req.json<{ userId: string; tempToken: string; code: string }>()

  if (!body.userId || !body.tempToken || !body.code) {
    return c.json({ error: 'userId, tempToken et code sont requis' }, 400)
  }

  const user = await authService.findUserById(body.userId)
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Vérifier le code TOTP AVANT de consommer le challenge
  // pour qu'un mauvais code ne brûle pas le temp token
  const codeValid = await totpService.verifyAndConsumeCounter(user.id, user.totpSecret, body.code)
  if (!codeValid) return c.json({ error: 'Code TOTP incorrect' }, 401)

  const tokenValid = await totpService.consumeChallenge(body.userId, body.tempToken)
  if (!tokenValid) return c.json({ error: 'Token invalide ou expiré' }, 401)

  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? c.req.header('x-real-ip')
  const session = await authService.createSession(user.id, ip, c.req.header('user-agent'))
  const tokens = await authService.generateTokens(user.id, user.role, session.id)

  const IS_PROD = process.env.NODE_ENV === 'production'
  const buildCookie = (name: string, value: string, maxAge: number) => {
    const parts = [`${name}=${value}`, `Max-Age=${maxAge}`, 'Path=/', 'HttpOnly', 'SameSite=Strict']
    if (IS_PROD) parts.push('Secure')
    return parts.join('; ')
  }

  c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true })
  c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true })

  return c.json({ user: { id: user.id, email: user.email, role: user.role } })
}
