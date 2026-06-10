import { Hono } from 'hono'
import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, brokers } from '../db/schema.js'
import { authMiddleware } from '../routes/auth/auth.middleware.js'


// ============================================================================
// FEATURE 15 : STATISTIQUES GLOBALES
// Route finale : GET /api/v1/stats
// ============================================================================
/*
 * Retourne pour l'utilisateur connecté (userId extrait du cookie JWT) :
 *  - Nombre de demandes par statut
 *  - Délai moyen de réponse des brokers (en jours)
 *  - Taux de réponse (% des demandes envoyées ayant reçu une réponse)
 *  - Brokers les plus réactifs (délai moyen par broker)
 *  - Total de demandes
 */

export const statsRoutes = new Hono()

statsRoutes.get('/', authMiddleware, async (c) => {
  try {
    // Auth Bleu — userId extrait du cookie JWT
    const userId = c.get('userId') as string

    // 1. Récupérer les demandes de l'utilisateur + le nom du broker associé
    const allRequests = await db
      .select({
        status: removalRequests.status,
        sentAt: removalRequests.sentAt,
        respondedAt: removalRequests.respondedAt,
        brokerId: removalRequests.brokerId,
        brokerName: brokers.name,
      })
      .from(removalRequests)
      .leftJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .where(eq(removalRequests.userId, userId))

    // 2. Calculer les compteurs par statut
    const countsByStatus = {
    DRAFT: 0,
    SENT: 0,
    ACKNOWLEDGED: 0,
    COMPLETED: 0,
    REFUSED: 0,
    NO_RESPONSE: 0,
    COMPLAINT: 0,
    SUPPRESSED: 0,
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

    // 4. Taux de réponse = demandes répondues / demandes effectivement envoyées
    let sentCount = 0
    for (const request of allRequests) {
      if (request.sentAt) sentCount++
    }
    const responseRate = sentCount > 0
      ? Math.round((respondedCount / sentCount) * 100)
      : null

    // 5. Brokers les plus réactifs : délai moyen de réponse par broker (les plus rapides en tête)
    const brokerStats = new Map<string, { name: string; totalMs: number; count: number }>()
    for (const request of allRequests) {
      if (request.sentAt && request.respondedAt && request.brokerId) {
        const diffMs = new Date(request.respondedAt).getTime() - new Date(request.sentAt).getTime()
        const entry = brokerStats.get(request.brokerId) ?? {
          name: request.brokerName ?? 'Inconnu',
          totalMs: 0,
          count: 0,
        }
        entry.totalMs += diffMs
        entry.count++
        brokerStats.set(request.brokerId, entry)
      }
    }
    const mostResponsiveBrokers = Array.from(brokerStats.entries())
      .map(([brokerId, s]) => ({
        brokerId,
        brokerName: s.name,
        avgResponseDays: Math.round(s.totalMs / s.count / (1000 * 60 * 60 * 24)),
        responseCount: s.count,
      }))
      .sort((a, b) => a.avgResponseDays - b.avgResponseDays)
      .slice(0, 3)

    return c.json({
      data: {
        total: allRequests.length,
        byStatus: countsByStatus,
        avgResponseDays,
        responseRate,
        mostResponsiveBrokers,
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
