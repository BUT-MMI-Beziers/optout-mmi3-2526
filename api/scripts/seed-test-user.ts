/**
 * Crée un utilisateur de test avec les champs chiffrés + forge un JWT.
 * Usage : npx tsx scripts/seed-test-user.ts
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sign } from 'jsonwebtoken'
import { users, userContacts } from '../src/db/schema.js'
import { encrypt } from '../src/utils/crypto.util.js'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

const [user] = await db
  .insert(users)
  .values({
    email: 'test@float.local',
    passwordHash: '$2b$10$placeholder_not_used_for_login',
    firstName: encrypt('Jean'),
    lastName: encrypt('Dupont'),
    role: 'user',
  })
  .onConflictDoNothing()
  .returning()

if (!user) {
  console.log('User test@float.local existe déjà, récupération...')
  const existing = await db.select().from(users)
  const found = existing.find(u => u.email === 'test@float.local')
  if (found) {
    const token = sign(
      { sub: found.id, email: found.email, role: found.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    console.log('\nUser ID :', found.id)
    console.log('\nJWT :\n' + token)
  }
  await client.end()
  process.exit(0)
}

// Ajouter un contact email et une adresse de test
await db.insert(userContacts).values([
  {
    userId: user.id,
    type: 'email',
    value: encrypt('jean.dupont@gmail.com'),
    isPrimary: true,
    label: 'perso',
  },
  {
    userId: user.id,
    type: 'address',
    value: encrypt('12 rue de la Paix, 75001 Paris'),
    isPrimary: true,
    label: 'domicile',
  },
])

const token = sign(
  { sub: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
)

console.log('\nUser créé avec succès !')
console.log('ID    :', user.id)
console.log('Email :', user.email)
console.log('\nJWT (valable 7j) :\n' + token)
console.log('\nTest rapide :')
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost/api/v1/users/me`)

await client.end()
