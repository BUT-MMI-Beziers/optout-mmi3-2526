// Rôle : point d'entrée HTTP du module auth.
// Valide les données reçues (format email, règles mot de passe, champs requis),
// retourne les erreurs 400/409 si nécessaire, puis délègue à auth.service.ts.
// Ne touche jamais la base de données directement.
//
// Reçoit les requêtes HTTP auth, valide les données et renvoie les réponses.
// Ne touche pas la base de données directement — délègue à auth.service.ts.
import type { Context } from 'hono'
import * as authService from './auth.service.js'

// ── Helpers de validation ───────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Retourne un message d'erreur si le mot de passe ne respecte pas les règles, sinon null.
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

  // Validation des champs obligatoires
  if (!email || !password || !firstName || !lastName) {
    return c.json({ error: 'email, password, firstName et lastName sont requis' }, 400)
  }
  if (!isValidEmail(email)) {
    return c.json({ error: 'Format d\'email invalide' }, 400)
  }
  const pwError = validatePassword(password)
  if (pwError) return c.json({ error: pwError }, 400)

  // Vérifie que l'email n'est pas déjà utilisé
  const existing = await authService.findUserByEmail(email.toLowerCase())
  if (existing) {
    return c.json({ error: 'Cet email est déjà utilisé' }, 409)
  }

  // Crée l'utilisateur (prénom/nom chiffrés, mot de passe hashé dans le service)
  const user = await authService.createUser({
    email: email.toLowerCase(),
    password,
    firstName,
    lastName,
  })
  const tokens = await authService.generateTokens(user.id, user.role)

  return c.json({ ...tokens, user }, 201)
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

  const tokens = await authService.generateTokens(user.id, user.role)
  return c.json({
    ...tokens,
    user: { id: user.id, email: user.email, role: user.role },
  })
}

// ── POST /api/auth/logout ───────────────────────────────────────────────────
// Les tokens JWT sont stateless : la déconnexion côté client suffit
// (suppression du token dans le localStorage). Pas de liste noire côté serveur.

export async function logout(c: Context) {
  return c.json({ message: 'Déconnexion réussie' })
}

// ── PATCH /api/auth/password ────────────────────────────────────────────────
// Route protégée par authMiddleware — l'utilisateur doit être connecté.
// Vérifie l'ancien mot de passe avant d'accepter le nouveau.

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
  return c.json({ message: 'Mot de passe mis à jour. Veuillez vous reconnecter.' })
}
