// Rôle : point d'entrée unique pour créer une notification utilisateur.
// Chaque notification appartient à une catégorie (confirmation / relance / refus)
// que l'utilisateur peut désactiver dans ses préférences. On lit la préférence
// avant d'insérer : si la catégorie est coupée, la notification n'est pas créée.
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, notifications, DEFAULT_PREFERENCES } from '../db/schema.js'

export type NotificationCategory = 'confirmation' | 'relance' | 'refus'

// Crée une notification si la catégorie est activée dans les préférences de l'utilisateur.
// Retourne true si la notification a été insérée, false si elle a été filtrée.
export async function notifyUser(
  userId: string,
  category: NotificationCategory,
  payload: { message: string; requestId?: string },
): Promise<boolean> {
  const rows = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const prefs = rows[0]?.preferences ?? DEFAULT_PREFERENCES
  if (!prefs.notifications[category]) return false

  await db.insert(notifications).values({
    userId,
    requestId: payload.requestId ?? null,
    message: payload.message,
  })
  return true
}
