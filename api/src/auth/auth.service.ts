import bcrypt from 'bcryptjs'
import { sign } from 'hono/jwt'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { users, refreshTokens } from '../db/schema.js'

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60    // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return secret
}

// ── Utilisateurs ────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email) })
}

export async function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

export async function createUser(data: {
  email: string
  password: string
  firstName: string
  lastName: string
}) {
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)
  const [user] = await db
    .insert(users)
    .values({
      email:        data.email,
      passwordHash,
      firstName:    data.firstName,
      lastName:     data.lastName,
    })
    .returning({
      id:    users.id,
      email: users.email,
      role:  users.role,
    })
  return user
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

// ── Tokens ──────────────────────────────────────────────────────────────────

export async function generateTokens(userId: string, role: 'user' | 'admin') {
  const now = Math.floor(Date.now() / 1000)
  const accessToken = await sign(
    { sub: userId, role, iat: now, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS },
    jwtSecret()
  )

  const refreshToken = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  await db.insert(refreshTokens).values({ userId, token: refreshToken, expiresAt })

  return { accessToken, refreshToken }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
}

// Révoque tous les refresh tokens d'un utilisateur (ex: changement de mot de passe)
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}
