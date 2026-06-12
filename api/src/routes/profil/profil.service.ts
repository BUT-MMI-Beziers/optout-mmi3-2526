// Rôle : logique métier du module profil — seul fichier qui lit/écrit les données personnelles.
// Toutes les valeurs sensibles (prénom, nom, contacts) sont chiffrées AES-256-GCM
// avant insertion et déchiffrées à la lecture. Gère les limites par type de contact,
// l'export RGPD Art. 15 (toutes les données de l'utilisateur en JSON) et les notifications.
//
// Logique métier du profil : lecture/écriture en base, chiffrement/déchiffrement,
// validation des limites de contacts, export RGPD, gestion des notifications.
import { eq, and } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users, userContacts, notifications, removalRequests, DEFAULT_PREFERENCES } from '../../db/schema.js'
import type { UserPreferences } from '../../db/schema.js'
import { encrypt, decrypt } from '../../utils/crypto.util.js'
import type {
  ProfilDto,
  ContactDto,
  NotificationDto,
  UpdateProfilBody,
  UpdatePreferencesBody,
  CreateContactBody,
  ContactType,
} from './profil.types.js'
import { CONTACT_LIMITS, REMINDER_DELAY } from './profil.types.js'

// ── Helpers ───────────────────────────────────────────────────

// Convertit une ligne de la table user_contacts en ContactDto déchiffré pour le client
function mapContact(row: typeof userContacts.$inferSelect): ContactDto {
  return {
    id: row.id,
    type: row.type as ContactType,
    value: decrypt(row.value),   // déchiffrement AES-256-GCM
    isPrimary: row.isPrimary,
    label: row.label ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

// ── Profil ────────────────────────────────────────────────────

// Retourne le profil complet avec contacts déchiffrés, ou null si l'utilisateur n'existe pas
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
    firstName: decrypt(user.firstName),  // déchiffrement AES-256-GCM
    lastName: decrypt(user.lastName),    // déchiffrement AES-256-GCM
    role: user.role,
    totpEnabled: user.totpEnabled,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    contacts: contactRows.map(mapContact),
  }
}

// Met à jour prénom et/ou nom (re-chiffrement avant écriture en base)
export async function updateProfil(userId: string, body: UpdateProfilBody): Promise<ProfilDto | null> {
  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (body.firstName !== undefined) updates.firstName = encrypt(body.firstName)
  if (body.lastName !== undefined)  updates.lastName  = encrypt(body.lastName)

  await db.update(users).set(updates).where(eq(users.id, userId))
  return getProfil(userId)
}

// Supprime le compte — les FK avec onDelete: 'cascade' suppriment automatiquement
// les contacts, demandes de suppression et notifications associés
export async function deleteProfil(userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId))
}

// ── Préférences ───────────────────────────────────────────────

// Retourne les préférences de l'utilisateur (fallback sur les valeurs par défaut
// si la colonne est vide — sécurise les comptes créés avant la migration).
export async function getPreferences(userId: string): Promise<UserPreferences | null> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!rows.length) return null
  return rows[0].preferences ?? DEFAULT_PREFERENCES
}

// Applique un patch partiel sur les préférences existantes.
// delayDays est borné, tout le reste est coercé en booléen pour ne jamais stocker d'input bancal.
export async function updatePreferences(
  userId: string,
  patch: UpdatePreferencesBody,
): Promise<UserPreferences | null> {
  const current = await getPreferences(userId)
  if (!current) return null

  const merged: UserPreferences = {
    notifications: {
      confirmation: patch.notifications?.confirmation ?? current.notifications.confirmation,
      relance: patch.notifications?.relance ?? current.notifications.relance,
      refus: patch.notifications?.refus ?? current.notifications.refus,
    },
    reminders: {
      enabled: patch.reminders?.enabled ?? current.reminders.enabled,
      delayDays: patch.reminders?.delayDays ?? current.reminders.delayDays,
    },
  }

  // Coercition booléenne + clamp du délai
  merged.notifications.confirmation = Boolean(merged.notifications.confirmation)
  merged.notifications.relance = Boolean(merged.notifications.relance)
  merged.notifications.refus = Boolean(merged.notifications.refus)
  merged.reminders.enabled = Boolean(merged.reminders.enabled)
  merged.reminders.delayDays = Math.min(
    REMINDER_DELAY.max,
    Math.max(REMINDER_DELAY.min, Math.round(merged.reminders.delayDays)),
  )

  await db
    .update(users)
    .set({ preferences: merged, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return merged
}

// ── Contacts ──────────────────────────────────────────────────

// Retourne tous les contacts de l'utilisateur (déchiffrés)
export async function getContacts(userId: string): Promise<ContactDto[]> {
  const rows = await db
    .select()
    .from(userContacts)
    .where(eq(userContacts.userId, userId))
  return rows.map(mapContact)
}

// Ajoute un contact après vérification de la limite max du type.
// Le premier contact d'un type devient automatiquement primary.
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

  const isPrimary = body.isPrimary ?? existing.length === 0

  // Si on force isPrimary sur ce contact, on retire le flag des autres du même type
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
      value: encrypt(body.value),  // chiffrement AES-256-GCM avant insertion
      isPrimary,
      label: body.label ?? null,
    })
    .returning()

  return { contact: mapContact(inserted) }
}

// Supprime un contact après vérification :
// - le contact appartient bien à cet utilisateur
// - la suppression ne descend pas en dessous du minimum requis pour ce type
export async function deleteContact(userId: string, contactId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(userContacts)
    .where(and(eq(userContacts.id, contactId), eq(userContacts.userId, userId)))
    .limit(1)

  if (!rows.length) return false

  const contact = rows[0]
  const min = CONTACT_LIMITS[contact.type as ContactType].min
  if (min > 0) {
    const count = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, userId), eq(userContacts.type, contact.type)))
    if (count.length <= min) return false
  }

  await db.delete(userContacts).where(eq(userContacts.id, contactId))
  return true
}

// ── Export RGPD (Art. 15) ─────────────────────────────────────

// Retourne toutes les données personnelles de l'utilisateur pour l'export RGPD.
// Inclut : profil, contacts, notifications, demandes de suppression envoyées.
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

// Retourne toutes les notifications de l'utilisateur
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

// Marque une notification comme lue — vérifie qu'elle appartient à l'utilisateur
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
