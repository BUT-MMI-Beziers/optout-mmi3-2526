import { Hono } from 'hono'
import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests } from '../db/schema.js'

// ============================================================================
// FEATURE 15 : STATISTIQUES GLOBALES
// Route finale : GET /api/v1/stats
// ============================================================================
/*
 * Retourne pour l'utilisateur connecté (userId en body en attendant auth Bleu) :
 *  - Nombre de demandes par statut (DRAFT, SENT, NO_RESPONSE, RESPONDED, CLOSED)
 *  - Délai moyen de réponse des brokers (en jours)
 *  - Total de demandes
 */

export const statsRoutes = new Hono()

statsRoutes.get('/', async (c) => {
  try {
    // TODO : remplacer par c.get('userId') quand auth Bleu est dispo
    const userId = c.req.query('userId')

    if (!userId) {
      return c.json({
        error: "userId requis en attendant l'auth JWT (query param ?userId=...)",
        code: "BAD_REQUEST"
      }, 400)
    }

    // 1. Compter les demandes par statut
    const allRequests = await db
      .select({
        status: removalRequests.status,
        sentAt: removalRequests.sentAt,
        respondedAt: removalRequests.respondedAt,
      })
      .from(removalRequests)
      .where(eq(removalRequests.userId, userId))

    // 2. Calculer les compteurs par statut
    const countsByStatus = {
      DRAFT: 0,
      SENT: 0,
      NO_RESPONSE: 0,
      RESPONDED: 0,
      CLOSED: 0,
    }

    let totalResponseTimeMs = 0
    let respondedCount = 0

    for (const request of allRequests) {
      // Incrémenter le compteur du statut
      if (request.status in countsByStatus) {
        countsByStatus[request.status as keyof typeof countsByStatus]++
      }

      // Calculer le délai de réponse si la demande a été répondue
      if (request.sentAt && request.respondedAt) {
        const diffMs = new Date(request.respondedAt).getTime() - new Date(request.sentAt).getTime()
        totalResponseTimeMs += diffMs
        respondedCount++
      }
    }

    // 3. Délai moyen de réponse en jours (null si aucune réponse)
    const avgResponseDays = respondedCount > 0
      ? Math.round(totalResponseTimeMs / respondedCount / (1000 * 60 * 60 * 24))
      : null

    return c.json({
      data: {
        total: allRequests.length,
        byStatus: countsByStatus,
        avgResponseDays,
      }
    }, 200)

  } catch (error) {
    console.error("[GET /stats] Erreur critique :", error)
    return c.json({
      error: "Erreur serveur lors du calcul des statistiques.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})