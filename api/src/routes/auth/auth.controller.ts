// Rôle : point d'entrée HTTP du module auth.
// Valide les données reçues, retourne les erreurs 400/409 si nécessaire,
// puis délègue à auth.service.ts.
// Les tokens sont transmis exclusivement via cookies HttpOnly Secure SameSite=Strict
// — jamais dans le body JSON — pour éviter toute fuite XSS.
import type { Context } from 'hono'
import * as authService from './auth.service.js'

const IS_PROD = process.env.NODE_ENV === 'production'

// Construit la valeur d'un Set-Cookie HttpOnly Secure SameSite=Strict.
function buildCookie(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
  ]
  if (IS_PROD) parts.push('Secure')
  return parts.join('; ')
}

function clearCookie(name: string): string {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`
}

// ── Helpers de validation ───────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères'
  return null
}

// ── POST /api/auth/register ─────────────────────────────────────────────────

export async function register(c: Context) {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400)
  }

  const { email, password, firstName, lastName } = body as {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
  }

  if (!email || !password || !firstName || !lastName) {
    return c.json({ error: 'email, password, firstName et lastName sont requis' }, 400)
  }
  if (!isValidEmail(email)) {
    return c.json({ error: 'Format d\'email invalide' }, 400)
  }
  const pwError = validatePassword(password)
  if (pwError) return c.json({ error: pwError }, 400)

  const existing = await authService.findUserByEmail(email.toLowerCase())
  if (existing) {
    return c.json({ error: 'Cet email est déjà utilisé' }, 409)
  }

  const user = await authService.createUser({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
  })
  // Pré-remplit le profil avec l'email du compte.
  await authService.ensureEmailContact(user.id, user.email)
  const session = await authService.createSession(user.id, getClientIp(c), c.req.header('user-agent'))
  const tokens = await authService.generateTokens(user.id, user.role, session.id)

  c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true })
  c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true })

  return c.json({ user }, 201)
}

// ── POST /api/auth/login ────────────────────────────────────────────────────

export async function login(c: Context) {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400)
  }

  const { email, password } = body as { email?: string; password?: string }

  if (!email || !password) {
    return c.json({ error: 'email et password sont requis' }, 400)
  }

  const user = await authService.findUserByEmail(email.toLowerCase())
  // Message volontairement vague pour ne pas révéler si l'email existe en base
  if (!user) {
    return c.json({ error: 'Identifiants invalides' }, 401)
  }

  const valid = await authService.verifyPassword(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Identifiants invalides' }, 401)
  }

  // Backfill : garantit que l'email du compte est dans le profil (anciens comptes).
  await authService.ensureEmailContact(user.id, user.email)

  // Si 2FA activée → émettre un temp token, pas de cookies
  if (user.totpEnabled) {
    const { createChallenge } = await import('./totp.service.js')
    const tempToken = await createChallenge(user.id)
    return c.json({ requiresTOTP: true, userId: user.id, tempToken }, 200)
  }

  const session = await authService.createSession(user.id, getClientIp(c), c.req.header('user-agent'))
  const tokens = await authService.generateTokens(user.id, user.role, session.id)

  c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true })
  c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true })

  return c.json({ user: { id: user.id, email: user.email, role: user.role } })
}

// ── POST /api/auth/refresh ──────────────────────────────────────────────────
// Échange le refresh token (cookie HttpOnly) contre un nouvel access token.
// Rotation : un nouveau refresh token est émis et l'ancien invalidé en base.
// Le refresh token a le format "<userId>.<random>" — userId extrait sans JWT.

export async function refresh(c: Context) {
  const refreshToken = getCookieValue(c, 'refreshToken')
  if (!refreshToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = refreshToken.split('.')[0]
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const user = await authService.verifyRefreshToken(userId, refreshToken)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const sessionId = c.get('sessionId') as string | undefined
  const tokens = await authService.generateTokens(user.id, user.role, sessionId ?? (await authService.createSession(user.id, getClientIp(c), c.req.header('user-agent'))).id)
  if (sessionId) authService.touchSession(sessionId)

  c.header('Set-Cookie', buildCookie('accessToken', tokens.accessToken, tokens.accessExpiresIn), { append: true })
  c.header('Set-Cookie', buildCookie('refreshToken', tokens.refreshToken, tokens.refreshExpiresIn), { append: true })

  return c.json({ ok: true })
}

// ── POST /api/auth/logout ───────────────────────────────────────────────────
// Révoque le refresh token en base et efface les deux cookies.

export async function logout(c: Context) {
  const userId = c.get('userId') as string | undefined
  const sessionId = c.get('sessionId') as string | undefined
  if (userId) {
    await authService.revokeRefreshToken(userId)
    if (sessionId) await authService.revokeSession(sessionId, userId)
  }
  c.header('Set-Cookie', clearCookie('accessToken'), { append: true })
  c.header('Set-Cookie', clearCookie('refreshToken'), { append: true })
  return c.json({ message: 'Déconnexion réussie' })
}

// ── GET /api/auth/sessions ──────────────────────────────────────────────────

export async function getSessions(c: Context) {
  const userId = c.get('userId')
  const sessionId = c.get('sessionId')
  const sessions = await authService.getSessionsByUser(userId)
  return c.json(sessions.map(s => ({ ...s, current: s.id === sessionId })))
}

// ── DELETE /api/auth/sessions/:id ──────────────────────────────────────────

export async function revokeSessionById(c: Context) {
  const userId = c.get('userId')
  const sessionId = c.get('sessionId')
  const id = c.req.param('id')
  if (id === sessionId) return c.json({ error: 'Impossible de révoquer la session courante' }, 400)
  const ok = await authService.revokeSession(id, userId)
  if (!ok) return c.json({ error: 'Session introuvable' }, 404)
  return c.body(null, 204)
}

// ── DELETE /api/auth/sessions ───────────────────────────────────────────────

export async function revokeOtherSessions(c: Context) {
  const userId = c.get('userId')
  const sessionId = c.get('sessionId')
  await authService.revokeOtherSessions(userId, sessionId)
  return c.json({ message: 'Autres sessions révoquées' })
}

// ── PATCH /api/auth/password ────────────────────────────────────────────────

export async function changePassword(c: Context) {
  const userId = c.get('userId')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400)
  }

  const { currentPassword, newPassword } = body as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'currentPassword et newPassword sont requis' }, 400)
  }
  const pwError = validatePassword(newPassword)
  if (pwError) return c.json({ error: pwError }, 400)

  const user = await authService.findUserById(userId)
  if (!user) return c.json({ error: 'Utilisateur introuvable' }, 404)

  const valid = await authService.verifyPassword(currentPassword, user.passwordHash)
  if (!valid) return c.json({ error: 'Mot de passe actuel incorrect' }, 400)

  await authService.updatePassword(userId, newPassword)
  // Révoque le refresh token pour forcer une reconnexion sur tous les appareils
  await authService.revokeRefreshToken(userId)
  c.header('Set-Cookie', clearCookie('accessToken'), { append: true })
  c.header('Set-Cookie', clearCookie('refreshToken'), { append: true })
  return c.json({ message: 'Mot de passe mis à jour. Veuillez vous reconnecter.' })
}

// ── Utilitaire ──────────────────────────────────────────────────────────────

function getCookieValue(c: Context, name: string): string | undefined {
  const cookieHeader = c.req.header('Cookie') ?? ''
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}

function getClientIp(c: Context): string | undefined {
  return c.req.header('x-forwarded-for')?.split(',')[0].trim()
    ?? c.req.header('x-real-ip')
    ?? undefined
}
