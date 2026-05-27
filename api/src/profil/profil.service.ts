import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userContacts, notifications, removalRequests } from '../db/schema.js'
import { encrypt, decrypt } from '../utils/crypto.util.js'
import type {
  ProfilDto,
  ContactDto,
  NotificationDto,
  UpdateProfilBody,
  CreateContactBody,
  ContactType,
} from './profil.types.js'
import { CONTACT_LIMITS } from './profil.types.js'

// ── Helpers ───────────────────────────────────────────────────

function mapContact(row: typeof userContacts.$inferSelect): ContactDto {
  return {
    id: row.id,
    type: row.type as ContactType,
    value: decrypt(row.value),
    isPrimary: row.isPrimary,
    label: row.label ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

// ── Profil ────────────────────────────────────────────────────

export async function getProfil(userId: string): Promise<ProfilDto | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!rows.length) return null
  const user = rows[0]

  const contactRows = await db
    .select()
    .from(userContacts)
    .where(eq(userContacts.userId, userId))

  return {
    id: user.id,
    email: user.email,
    firstName: decrypt(user.firstName),
    lastName: decrypt(user.lastName),
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    contacts: contactRows.map(mapContact),
  }
}

export async function updateProfil(userId: string, body: UpdateProfilBody): Promise<ProfilDto | null> {
  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (body.firstName !== undefined) updates.firstName = encrypt(body.firstName)
  if (body.lastName !== undefined)  updates.lastName  = encrypt(body.lastName)

  await db.update(users).set(updates).where(eq(users.id, userId))
  return getProfil(userId)
}

export async function deleteProfil(userId: string): Promise<void> {
  // Les FK avec onDelete: 'cascade' suppriment automatiquement
  // user_contacts, removal_requests, notifications liés
  await db.delete(users).where(eq(users.id, userId))
}

// ── Contacts ──────────────────────────────────────────────────

export async function getContacts(userId: string): Promise<ContactDto[]> {
  const rows = await db
    .select()
    .from(userContacts)
    .where(eq(userContacts.userId, userId))
  return rows.map(mapContact)
}

export async function addContact(
  userId: string,
  body: CreateContactBody,
): Promise<{ error?: string; contact?: ContactDto }> {
  const existing = await db
    .select()
    .from(userContacts)
    .where(and(eq(userContacts.userId, userId), eq(userContacts.type, body.type)))

  const limit = CONTACT_LIMITS[body.type].max
  if (existing.length >= limit) {
    return { error: `Maximum ${limit} ${body.type}(s) allowed` }
  }

  // Le premier contact du type devient primary si aucun n'existe
  const isPrimary = body.isPrimary ?? existing.length === 0

  // Si on force isPrimary, retirer le flag des autres
  if (isPrimary) {
    await db
      .update(userContacts)
      .set({ isPrimary: false })
      .where(and(eq(userContacts.userId, userId), eq(userContacts.type, body.type)))
  }

  const [inserted] = await db
    .insert(userContacts)
    .values({
      userId,
      type: body.type,
      value: encrypt(body.value),
      isPrimary,
      label: body.label ?? null,
    })
    .returning()

  return { contact: mapContact(inserted) }
}

export async function deleteContact(userId: string, contactId: string): Promise<boolean> {
  // Vérifier que le contact appartient bien à l'utilisateur
  const rows = await db
    .select()
    .from(userContacts)
    .where(and(eq(userContacts.id, contactId), eq(userContacts.userId, userId)))
    .limit(1)

  if (!rows.length) return false

  // Vérifier la contrainte min (email min 1, address min 1)
  const contact = rows[0]
  const min = CONTACT_LIMITS[contact.type as ContactType].min
  if (min > 0) {
    const count = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, userId), eq(userContacts.type, contact.type)))
    if (count.length <= min) return false // suppression refusée
  }

  await db.delete(userContacts).where(eq(userContacts.id, contactId))
  return true
}

// ── Export RGPD (Art. 15) ─────────────────────────────────────

export async function exportUserData(userId: string) {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!userRows.length) return null
  const user = userRows[0]

  const contactRows = await db.select().from(userContacts).where(eq(userContacts.userId, userId))
  const notifRows   = await db.select().from(notifications).where(eq(notifications.userId, userId))
  const requestRows = await db.select().from(removalRequests).where(eq(removalRequests.userId, userId))

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      firstName: decrypt(user.firstName),
      lastName: decrypt(user.lastName),
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    contacts: contactRows.map(mapContact),
    notifications: notifRows.map((n) => ({
      id: n.id,
      message: n.message,
      isRead: n.isRead,
      requestId: n.requestId,
      createdAt: n.createdAt.toISOString(),
    })),
    removalRequests: requestRows.map((r) => ({
      id: r.id,
      brokerId: r.brokerId,
      status: r.status,
      sentAt: r.sentAt?.toISOString() ?? null,
      respondedAt: r.respondedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

// ── Notifications ─────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<NotificationDto[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
  return rows.map((n) => ({
    id: n.id,
    requestId: n.requestId ?? null,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function markNotificationRead(
  userId: string,
  notifId: string,
): Promise<NotificationDto | null> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)))
    .limit(1)

  if (!rows.length) return null

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notifId))

  return {
    id: rows[0].id,
    requestId: rows[0].requestId ?? null,
    message: rows[0].message,
    isRead: true,
    createdAt: rows[0].createdAt.toISOString(),
  }
}
