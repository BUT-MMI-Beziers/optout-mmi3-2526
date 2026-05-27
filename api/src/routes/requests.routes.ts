import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db' 
import { removalRequests, users, brokers, emailTemplates, userContacts } from '../db/schema'
import { renderTemplate } from '../services/template.service'

export const requestsRoutes = new Hono()

// SÉCURITÉ : Regex pour valider le format UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// LISTER TOUTES LES DEMANDES
// Route finale : GET /api/v1/requests
// ============================================================================
/*
 * TODO (SÉCURITÉ) : Route temporairement publique.
 * À protéger avec le middleware d'authentification plus tard.
 */
requestsRoutes.get('/', async (c) => {
  try {
    const requestsList = await db
      .select()
      .from(removalRequests)

    return c.json({
      data: requestsList,
      count: requestsList.length
    }, 200)

  } catch (error) {
    console.error("[GET /requests] Erreur critique :", error)
    return c.json({
      error: "Impossible de récupérer la liste des requêtes.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

// ============================================================================
// FEATURE 6 : PRÉVISUALISATION D'UNE DEMANDE
// Route finale : GET /api/v1/requests/:id/preview
// ============================================================================
/*
 * TODO (SÉCURITÉ) : Route temporairement publique. 
 * L'équipe Bleue devra ajouter le middleware d'authentification 
 * quand ils auront fini leur module.
 */
requestsRoutes.get('/:id/preview', async (c) => {
  try {
    const requestId = c.req.param('id')

    // SÉCURITÉ : Validation stricte du format UUID
    if (!uuidRegex.test(requestId)) {
      return c.json({
        error: "Format d'identifiant de demande invalide. Un UUID est attendu.",
        code: "BAD_REQUEST"
      }, 400)
    }

    const requestData = await db
      .select({
        request: removalRequests,
        user: users,
        broker: brokers,
        template: emailTemplates
      })
      .from(removalRequests)
      .innerJoin(users, eq(removalRequests.userId, users.id))
      .innerJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .innerJoin(emailTemplates, eq(removalRequests.templateId, emailTemplates.id))
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (requestData.length === 0) {
      return c.json({
        error: "La demande de suppression spécifiée est introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    const data = requestData[0]

    const addressData = await db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.userId, data.user.id),
          eq(userContacts.type, 'address'),
          eq(userContacts.isPrimary, true)
        )
      )
      .limit(1)

    const userAddress = addressData.length > 0 ? addressData[0].value : "[Adresse non renseignée]"

    // FEATURE 3 : Utilisation du service d'interpolation centralisé
    const previewSubject = renderTemplate(data.template.subject, {
      user: data.user,
      userAddress: userAddress,
      broker: data.broker,
      request: data.request
    })

    const previewBody = renderTemplate(data.template.body, {
      user: data.user,
      userAddress: userAddress,
      broker: data.broker,
      request: data.request
    })

    return c.json({
      data: {
        subject: previewSubject,
        body: previewBody
      }
    }, 200)

  } catch (error) {
    console.error(`[GET /requests/${c.req.param('id')}/preview] Erreur critique :`, error)
    return c.json({
      error: "Une erreur interne est survenue lors de la prévisualisation de la demande.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})