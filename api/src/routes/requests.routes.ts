import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db' 
import { removalRequests, users, brokers, emailTemplates, userContacts } from '../db/schema'
import { renderTemplate } from '../services/template.service'
import { emailQueue } from '../services/queue.service'

export const requestsRoutes = new Hono()

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// LISTER TOUTES LES DEMANDES
// Route finale : GET /api/v1/requests
// ============================================================================
requestsRoutes.get('/', async (c) => {
  try {
    const requestsList = await db.select().from(removalRequests)
    return c.json({ data: requestsList, count: requestsList.length }, 200)
  } catch (error) {
    console.error("[GET /requests] Erreur critique :", error)
    return c.json({
      error: "Impossible de récupérer la liste des requêtes.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

// ============================================================================
// FEATURE 6/3 : PRÉVISUALISATION D'UNE DEMANDE (Refactorisée)
// Route finale : GET /api/v1/requests/:id/preview
// ============================================================================
requestsRoutes.get('/:id/preview', async (c) => {
  try {
    const requestId = c.req.param('id')

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

    // Création du contexte propre pour le service
    const context = {
      user: {
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email
      },
      userAddress: userAddress,
      broker: {
        name: data.broker.name,
        emailContact: data.broker.emailContact
      },
      request: {
        id: data.request.id,
        createdAt: data.request.createdAt
      }
    }

    // Appel du service pour générer le texte final
    const previewSubject = renderTemplate(data.template.subject, context)
    const previewBody = renderTemplate(data.template.body, context)

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

// ============================================================================
// FEATURE 9 : ENVOI D'UNE DEMANDE (Mise en file d'attente)
// Route finale : POST /api/v1/requests/:id/send
// ============================================================================
/*
 * Utilité : Récupère une demande au statut DRAFT, l'ajoute dans la file d'attente 
 * BullMQ (Redis) pour envoi asynchrone par le Worker, et met à jour son statut à SENT.
 */
requestsRoutes.post('/:id/send', async (c) => {
  try {
    const requestId = c.req.param('id')

    // SÉCURITÉ : Validation stricte du format UUID
    if (!uuidRegex.test(requestId)) {
      return c.json({
        error: "Format d'identifiant de demande invalide. Un UUID est attendu.",
        code: "BAD_REQUEST"
      }, 400)
    }

    // 1. Récupérer la demande existante
    const requestData = await db
      .select()
      .from(removalRequests)
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (requestData.length === 0) {
      return c.json({
        error: "La demande spécifiée est introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    const request = requestData[0]

    // 2. Vérifier les conditions d'envoi
    if (request.status !== 'DRAFT') {
      return c.json({
        error: "La demande doit être au statut DRAFT pour être envoyée.",
        code: "BAD_REQUEST"
      }, 400)
    }

    if (!request.emailBody) {
      return c.json({
        error: "Impossible d'envoyer l'email : le corps du message est vide.",
        code: "BAD_REQUEST"
      }, 400)
    }

    // 3. Ajouter un "Job" dans la file d'attente Redis (BullMQ)
    await emailQueue.add('send-request', { 
      requestId: request.id 
    })
    
    console.log(`[Queue] Job ajouté pour la demande : ${request.id}`)

    // 4. Mettre à jour le statut en base de données
    const updatedRequest = await db
      .update(removalRequests)
      .set({
        status: 'SENT',
        sentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(removalRequests.id, requestId))
      .returning()

    // 5. Réponse de succès
    return c.json({
      message: "Demande ajoutée à la file d'attente avec succès.",
      data: updatedRequest[0]
    }, 200)

  } catch (error) {
    console.error(`[POST /requests/${c.req.param('id')}/send] Erreur critique :`, error)
    return c.json({
      error: "Erreur serveur lors de la mise en file d'attente de la demande.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

export default requestsRoutes