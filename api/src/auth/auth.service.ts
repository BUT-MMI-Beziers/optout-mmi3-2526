// Rôle : logique métier de l'authentification — seul fichier qui écrit dans la table users.
// Gère le hashage bcrypt des mots de passe (12 rounds), le chiffrement AES-256-GCM
// des données personnelles (prénom, nom) avant insertion, et la génération des tokens JWT
// avec le rôle embarqué dans le payload. Ne traite jamais de requêtes HTTP directement.
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { sign } from 'hono/jwt'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { encrypt } from '../utils/crypto.util.js'

// 12 rounds bcrypt = bon équilibre sécurité / performance (~300ms par hash)
const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60          // 15 minutes
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 jours

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return secret
}

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
      firstName:    encrypt(data.firstName),
      lastName:     encrypt(data.lastName),
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

// Génère access token JWT (15 min) + refresh token opaque (7 jours).
// Le refresh token brut est retourné pour être placé en cookie HttpOnly.
// Seul son hash bcrypt est stocké en base — jamais la valeur brute.
export async function generateTokens(userId: string, role: 'user' | 'admin') {
  const now = Math.floor(Date.now() / 1000)

  const accessToken = await sign(
    { sub: userId, role, iat: now, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS },
    jwtSecret()
  )

  // Format : "<userId>.<random>" — le userId permet de retrouver l'utilisateur sans JWT
  const refreshToken = `${userId}.${randomBytes(64).toString('hex')}`
  const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS)

  await db
    .update(users)
    .set({ refreshTokenHash, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return { accessToken, refreshToken, accessExpiresIn: ACCESS_TOKEN_EXPIRY_SECONDS, refreshExpiresIn: REFRESH_TOKEN_EXPIRY_SECONDS }
}

// Vérifie le refresh token brut contre le hash en base.
// Retourne l'utilisateur si valide, null sinon.
export async function verifyRefreshToken(userId: string, token: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user?.refreshTokenHash) return null
  const valid = await bcrypt.compare(token, user.refreshTokenHash)
  return valid ? user : null
}

// Révoque le refresh token en base (logout réel).
export async function revokeRefreshToken(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ refreshTokenHash: null, updatedAt: new Date() })
    .where(eq(users.id, userId))
}
