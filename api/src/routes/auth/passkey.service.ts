import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from '@simplewebauthn/types'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { passkeyCredentials, users } from '../../db/schema.js'

const RP_NAME = 'FLOAT'
const RP_ID  = process.env.RP_ID  ?? 'localhost'
const ORIGIN = process.env.RP_ORIGIN ?? 'http://localhost:5173'

// Challenges en mémoire (TTL 5 min) — acceptable pour un MVP
const challenges = new Map<string, { challenge: string; expiresAt: number }>()

function storeChallenge(userId: string, challenge: string) {
  challenges.set(userId, { challenge, expiresAt: Date.now() + 5 * 60_000 })
}

function popChallenge(userId: string): string | null {
  const entry = challenges.get(userId)
  challenges.delete(userId)
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.challenge
}

// ── Registration ─────────────────────────────────────────────────────────────

export async function startRegistration(userId: string, email: string) {
  const existing = await db
    .select({ credentialId: passkeyCredentials.credentialId, transports: passkeyCredentials.transports })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, userId))

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: email,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    excludeCredentials: existing.map(c => ({
      id: c.credentialId,
      transports: JSON.parse(c.transports ?? '[]') as AuthenticatorTransportFuture[],
    })),
  })

  storeChallenge(userId, options.challenge)
  return options
}

export async function finishRegistration(userId: string, body: unknown, keyName?: string) {
  const expectedChallenge = popChallenge(userId)
  if (!expectedChallenge) throw new Error('Challenge expiré ou introuvable')

  const verification = await verifyRegistrationResponse({
    response: body as Parameters<typeof verifyRegistrationResponse>[0]['response'],
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Vérification échouée')
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  await db.insert(passkeyCredentials).values({
    userId,
    credentialId: credential.id,
    publicKey:    Buffer.from(credential.publicKey).toString('base64url'),
    counter:      credential.counter,
    deviceType:   credentialDeviceType as CredentialDeviceType,
    backedUp:     credentialBackedUp,
    transports:   JSON.stringify(credential.transports ?? []),
    name:         keyName ?? 'Clé de sécurité',
  })

  return true
}

// ── Authentication ────────────────────────────────────────────────────────────

// challenge_key = email pour l'auth (userId inconnu avant vérification)
const AUTH_KEY = '__auth__'

export async function startAuthentication(email?: string) {
  let allowCredentials: { id: string; transports: AuthenticatorTransportFuture[] }[] | undefined

  if (email) {
    const user = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1)
    if (user.length) {
      const creds = await db
        .select({ credentialId: passkeyCredentials.credentialId, transports: passkeyCredentials.transports })
        .from(passkeyCredentials)
        .where(eq(passkeyCredentials.userId, user[0].id))
      allowCredentials = creds.map(c => ({
        id: c.credentialId,
        transports: JSON.parse(c.transports ?? '[]') as AuthenticatorTransportFuture[],
      }))
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials,
  })

  storeChallenge(AUTH_KEY, options.challenge)
  return options
}

export async function finishAuthentication(body: unknown) {
  const expectedChallenge = popChallenge(AUTH_KEY)
  if (!expectedChallenge) throw new Error('Challenge expiré')

  // Récupérer la credential par id
  const incoming = body as { id: string }
  const cred = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.credentialId, incoming.id))
    .limit(1)

  if (!cred.length) throw new Error('Credential introuvable')
  const stored = cred[0]

  const verification = await verifyAuthenticationResponse({
    response: body as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    credential: {
      id: stored.credentialId,
      publicKey: Buffer.from(stored.publicKey, 'base64url'),
      counter: stored.counter,
      transports: JSON.parse(stored.transports ?? '[]') as AuthenticatorTransportFuture[],
    },
  })

  if (!verification.verified) throw new Error('Vérification échouée')

  // Mettre à jour le counter (anti-replay WebAuthn)
  await db
    .update(passkeyCredentials)
    .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
    .where(eq(passkeyCredentials.id, stored.id))

  // Récupérer l'utilisateur
  const user = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1)
  if (!user.length) throw new Error('Utilisateur introuvable')

  return user[0]
}

// ── Gestion des passkeys ──────────────────────────────────────────────────────

export async function listPasskeys(userId: string) {
  return db
    .select({ id: passkeyCredentials.id, name: passkeyCredentials.name, deviceType: passkeyCredentials.deviceType, backedUp: passkeyCredentials.backedUp, createdAt: passkeyCredentials.createdAt, lastUsedAt: passkeyCredentials.lastUsedAt })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, userId))
}

export async function deletePasskey(passkeyId: string, userId: string) {
  const result = await db
    .delete(passkeyCredentials)
    .where(eq(passkeyCredentials.id, passkeyId))
    .returning({ userId: passkeyCredentials.userId })
  return result.length > 0 && result[0].userId === userId
}
