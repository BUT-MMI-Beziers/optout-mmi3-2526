// Rôle : logique métier de l'authentification — seul fichier qui écrit dans la table users.
// Gère le hashage bcrypt des mots de passe (12 rounds), le chiffrement AES-256-GCM
// des données personnelles (prénom, nom) avant insertion, et la génération des tokens JWT
// avec le rôle embarqué dans le payload. Ne traite jamais de requêtes HTTP directement.
//
// Contient la logique métier de l'authentification :
// hashage des mots de passe, chiffrement des données personnelles,
// génération des tokens JWT. Seul fichier qui écrit dans la table users.
import bcrypt from 'bcryptjs'
import { sign } from 'hono/jwt'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { encrypt } from '../utils/crypto.util.js'

// 12 rounds bcrypt = bon équilibre sécurité / performance (~300ms par hash)
const BCRYPT_ROUNDS = 12
// Token valide 15 minutes — court pour limiter l'exposition en cas de fuite
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return secret
}

// Recherche un utilisateur par email (utilisé au login et à l'inscription)
export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email) })
}

// Recherche un utilisateur par id (utilisé pour le changement de mot de passe)
export async function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

// Crée un utilisateur : hash le mot de passe, chiffre prénom et nom avant insertion.
// Ne retourne jamais le passwordHash ni les données chiffrées au controller.
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
      // Chiffrés en AES-256-GCM — lisibles uniquement avec APP_ENCRYPTION_KEY
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

// Compare le mot de passe en clair avec le hash stocké en base
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Hash le nouveau mot de passe et met à jour la base
export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

// Génère un access token JWT signé avec JWT_SECRET.
// Le payload contient userId (sub), role, et les timestamps d'émission/expiration.
export async function generateTokens(userId: string, role: 'user' | 'admin') {
  const now = Math.floor(Date.now() / 1000)
  const accessToken = await sign(
    { sub: userId, role, iat: now, exp: now + ACCESS_TOKEN_EXPIRY_SECONDS },
    jwtSecret()
  )
  return { accessToken }
}
