import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../index.js'
import { users } from '../schema.js'
import { encrypt } from '../../utils/crypto.util.js'

const BCRYPT_ROUNDS = 12

// Crée le compte administrateur par défaut à partir des variables d'environnement
// ADMIN_EMAIL / ADMIN_PASSWORD. Idempotent : si le compte existe déjà, on ne touche
// à rien (le mot de passe peut avoir été changé depuis l'interface — ne jamais l'écraser).
// Si ADMIN_PASSWORD est absent du .env, aucun compte n'est créé : pas de mot de passe
// par défaut codé en dur.
export async function seedAdmin(database: any = db) {
  const email = process.env.ADMIN_EMAIL ?? 'admin@float.local'
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    console.warn('ADMIN_PASSWORD non défini dans le .env — seed du compte admin ignoré.')
    return
  }

  try {
    const [existing] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      console.log(`Le compte admin ${email} existe déjà. Seed ignoré.`)
      return
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    await database.insert(users).values({
      email,
      passwordHash,
      firstName: encrypt('Admin'),
      lastName: encrypt('FLOAT'),
      role: 'admin',
    })

    console.log(`Compte admin ${email} créé (mot de passe issu de ADMIN_PASSWORD).`)
  } catch (error) {
    console.error('Erreur lors du seed du compte admin :', error)
  }
}
