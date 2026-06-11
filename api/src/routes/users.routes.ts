import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { notifications, users } from '../db/schema.js'

export const usersRoutes = new Hono()

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ============================================================================
// FEATURE 18 : LISTE DES NOTIFICATIONS D'UN UTILISATEUR
// Route finale : GET /api/v1/users/me/notifications
//
// Retourne toutes les notifications de l'utilisateur, triées de la plus
// récente à la plus ancienne.
//
// Note temporaire : l'identifiant utilisateur est passé en query param
// (?user_id=<uuid>) en attendant l'intégration du middleware JWT (groupe bleu).
// Une fois l'auth en place, user_id sera extrait du token.
//
// Query params :
//   - user_id (requis) : UUID de l'utilisateur connecté
//
// Réponses :
//   200 - Tableau des notifications (peut être vide)
//   400 - user_id manquant ou format UUID invalide
//   404 - Utilisateur introuvable
//   500 - Erreur interne
// ============================================================================
usersRoutes.get('/me/notifications', async (c) => {
  try {
    const userId = c.req.query('user_id')

    if (!userId || !uuidRegex.test(userId)) {
      return c.json({
        error: "user_id est requis et doit être un UUID valide.",
        code: "BAD_REQUEST"
      }, 400)
    }

    // Vérification de l'existence de l'utilisateur avant de requêter ses notifications
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userExists.length === 0) {
      return c.json({
        error: "Utilisateur introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))

    return c.json({ data: userNotifications }, 200)

  } catch (error) {
    console.error('[GET /users/me/notifications] Erreur :', error)
    return c.json({
      error: "Erreur interne lors de la récupération des notifications.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

// ============================================================================
// FEATURE 18 : MARQUER UNE NOTIFICATION COMME LUE
// Route finale : PATCH /api/v1/users/me/notifications/:id
//
// Met à jour le champ is_read à true pour la notification ciblée.
// Idempotent : appeler la route sur une notification déjà lue ne produit
// pas d'erreur.
//
// Params :
//   - id (requis) : UUID de la notification à marquer comme lue
//
// Réponses :
//   200 - Notification mise à jour retournée
//   400 - Format UUID invalide
//   404 - Notification introuvable
//   500 - Erreur interne
// ============================================================================
usersRoutes.patch('/me/notifications/:id', async (c) => {
  try {
    const notificationId = c.req.param('id')

    if (!uuidRegex.test(notificationId)) {
      return c.json({
        error: "Format d'identifiant invalide. Un UUID est attendu.",
        code: "BAD_REQUEST"
      }, 400)
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1)

    if (rows.length === 0) {
      return c.json({
        error: "Notification introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning()

    return c.json({ data: updated }, 200)

  } catch (error) {
    console.error(`[PATCH /users/me/notifications/${c.req.param('id')}] Erreur :`, error)
    return c.json({
      error: "Erreur interne lors de la mise à jour de la notification.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})
