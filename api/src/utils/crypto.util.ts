import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96 bits recommandé pour GCM
const TAG_LENGTH = 16  // 128 bits (défaut GCM)

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw || raw.length < 32) {
    throw new Error('APP_ENCRYPTION_KEY must be set and at least 32 characters long')
  }
  // Tronquer/padder à 32 octets (256 bits)
  return Buffer.from(raw.slice(0, 32), 'utf8')
}

/**
 * Chiffre une chaîne en AES-256-GCM.
 * Format de sortie : <iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Déchiffre une chaîne produite par encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')

  const [ivHex, tagHex, dataHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
