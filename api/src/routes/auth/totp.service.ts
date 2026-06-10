import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users, totpChallenges } from '../../db/schema.js'
import { encrypt, decrypt } from '../../utils/crypto.util.js'

// Implémentation TOTP RFC 6238 native — zéro dépendance externe
// OWASP : secret 160 bits minimum, fenêtre ±1 pour tolérer le drift d'horloge

const STEP = 30
const DIGITS = 6
const WINDOW = 1
const APP_NAME = 'FLOAT'
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const ch of str) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error(`Caractère base32 invalide : ${ch}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (
    ((hmac[offset]     & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8)  |
     (hmac[offset + 3] & 0xff)
  ) % 10 ** DIGITS
  return code.toString().padStart(DIGITS, '0')
}

function totpCounter(): number {
  return Math.floor(Date.now() / 1000 / STEP)
}

// ── Export publics ────────────────────────────────────────────────────────────

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)) // 160 bits
}

export function getTotpUri(secret: string, email: string): string {
  const params = new URLSearchParams({
    secret,
    issuer: APP_NAME,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP),
  })
  return `otpauth://totp/${encodeURIComponent(APP_NAME)}:${encodeURIComponent(email)}?${params}`
}

// Retourne le counter utilisé si valide, -1 sinon
export function verifyTotpRaw(secret: string, token: string, lastCounter?: number | null): number {
  const key = base32Decode(secret)
  const counter = totpCounter()
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const c = counter + i
    if (lastCounter != null && c <= lastCounter) continue // anti-replay
    const expected = Buffer.from(hotp(key, c))
    const actual   = Buffer.from(token.padStart(DIGITS, '0').slice(0, DIGITS))
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return c
  }
  return -1
}

export function verifyTotpCode(encryptedSecret: string, token: string, lastCounter?: number | null): boolean {
  return verifyTotpRaw(decrypt(encryptedSecret), token, lastCounter) >= 0
}

// ── Activation ───────────────────────────────────────────────────────────────

export async function activateTotp(userId: string, secret: string, code: string): Promise<boolean> {
  const counter = verifyTotpRaw(secret, code)
  if (counter < 0) return false
  await db
    .update(users)
    .set({ totpSecret: encrypt(secret), totpEnabled: true, totpLastCounter: counter, updatedAt: new Date() })
    .where(eq(users.id, userId))
  return true
}

// Vérifie le code TOTP d'un utilisateur et met à jour son lastCounter (anti-replay)
export async function verifyAndConsumeCounter(userId: string, encryptedSecret: string, code: string): Promise<boolean> {
  const row = await db.select({ totpLastCounter: users.totpLastCounter }).from(users).where(eq(users.id, userId)).limit(1)
  const lastCounter = row[0]?.totpLastCounter ?? null
  const counter = verifyTotpRaw(decrypt(encryptedSecret), code, lastCounter)
  if (counter < 0) return false
  await db.update(users).set({ totpLastCounter: counter }).where(eq(users.id, userId))
  return true
}

// ── Désactivation ─────────────────────────────────────────────────────────────

export async function deactivateTotp(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ totpSecret: null, totpEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

// ── Temp token (challenge login 2FA) ─────────────────────────────────────────

export async function createChallenge(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(token, 10)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  await db.insert(totpChallenges).values({ userId, tokenHash, expiresAt })
  return token
}

export async function consumeChallenge(userId: string, token: string): Promise<boolean> {
  const now = new Date()
  const challenges = await db
    .select()
    .from(totpChallenges)
    .where(and(eq(totpChallenges.userId, userId), isNull(totpChallenges.usedAt), gt(totpChallenges.expiresAt, now)))

  for (const challenge of challenges) {
    if (await bcrypt.compare(token, challenge.tokenHash)) {
      await db.update(totpChallenges).set({ usedAt: now }).where(eq(totpChallenges.id, challenge.id))
      return true
    }
  }
  return false
}
