import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, users, brokers, emailTemplates, userContacts, requestEvents } from '../db/schema.js'
import { renderTemplate } from '../services/template.service.js'
import { emailQueue } from '../services/queue.service.js'

export const requestsRoutes = new Hono()

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// FEATURE 11 : LISTER LES DEMANDES AVEC FILTRES ET PAGINATION
// Route finale : GET /api/v1/requests
// ============================================================================
/*
 * Query params disponibles :
 *  - status     : filtre par statut (DRAFT, SENT, NO_RESPONSE, RESPONDED, CLOSED)
 *  - broker_id  : filtre par broker UUID
 *  - page       : numéro de page (défaut: 1)
 *  - limit      : nombre de résultats par page (défaut: 10, max: 100)
 *
 * Réponse :
 *  - data       : tableau des demandes
 *  - total      : nombre total de résultats (avant pagination)
 *  - page       : page actuelle
 *  - limit      : limite actuelle
 *  - totalPages : nombre total de pages
 */
requestsRoutes.get('/', async (c) => {
  try {
    // 1. Récupérer et valider les query params
    const statusParam = c.req.query('status')
    const brokerIdParam = c.req.query('broker_id')
    const pageParam = c.req.query('page')
    const limitParam = c.req.query('limit')

    // Valider le statut si fourni
    const validStatuses = ['DRAFT', 'SENT', 'NO_RESPONSE', 'RESPONDED', 'CLOSED']
    if (statusParam && !validStatuses.includes(statusParam)) {
      return c.json({
        error: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`,
        code: "BAD_REQUEST"
      }, 400)
    }

    // Valider le broker_id si fourni
    if (brokerIdParam && !uuidRegex.test(brokerIdParam)) {
      return c.json({
        error: "broker_id doit être un UUID valide.",
        code: "BAD_REQUEST"
      }, 400)
    }

    // Parser et valider page + limit
    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '10')))
    const offset = (page - 1) * limit

    // 2. Construire les conditions de filtre
    const conditions = []

    if (statusParam) {
      conditions.push(eq(removalRequests.status, statusParam as any))
    }

    if (brokerIdParam) {
      conditions.push(eq(removalRequests.brokerId, brokerIdParam))
    }

    // 3. Récupérer les demandes avec filtres + pagination
    const requestsList = await db
      .select()
      .from(removalRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(removalRequests.createdAt)
      .limit(limit)
      .offset(offset)

    // 4. Compter le total (pour calculer totalPages)
    const allRequests = await db
      .select({ id: removalRequests.id })
      .from(removalRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const total = allRequests.length
    const totalPages = Math.ceil(total / limit)

    return c.json({
      data: requestsList,
      total,
      page,
      limit,
      totalPages,
    }, 200)

  } catch (error) {
    console.error("[GET /requests] Erreur critique :", error)
    return c.json({
      error: "Impossible de récupérer la liste des demandes.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

// ============================================================================
// FEATURE 12 : DÉTAIL COMPLET D'UNE DEMANDE
// Route finale : GET /api/v1/requests/:id
// ============================================================================
/*
 * Retourne une demande complète avec :
 *  - le broker associé
 *  - le template associé
 *  - l'historique des événements (request_events)
 */
requestsRoutes.get('/:id', async (c) => {
  try {
    const requestId = c.req.param('id')

    // SÉCURITÉ : Validation stricte du format UUID
    if (!uuidRegex.test(requestId)) {
      return c.json({
        error: "Format d'identifiant de demande invalide. Un UUID est attendu.",
        code: "BAD_REQUEST"
      }, 400)
    }

    // 1. Récupérer la demande avec broker + template (jointures)
    const rows = await db
      .select({
        request: removalRequests,
        broker: brokers,
        template: emailTemplates,
      })
      .from(removalRequests)
      .innerJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .innerJoin(emailTemplates, eq(removalRequests.templateId, emailTemplates.id))
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (rows.length === 0) {
      return c.json({
        error: "La demande spécifiée est introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    const data = rows[0]

    // 2. Récupérer l'historique des événements
    const events = await db
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, requestId))
      .orderBy(requestEvents.createdAt)

    // 3. Retourner le tout assemblé
    return c.json({
      data: {
        ...data.request,
        broker: data.broker,
        template: data.template,
        events,
      }
    }, 200)

  } catch (error) {
    console.error(`[GET /requests/${c.req.param('id')}] Erreur critique :`, error)
    return c.json({
      error: "Une erreur interne est survenue lors de la récupération de la demande.",
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

// ============================================================================
// FEATURE 10 : ENVOI EN MASSE (BATCH)
// Route finale : POST /api/v1/requests/batch
// ============================================================================
/*
 * Utilité : Crée et envoie des demandes à plusieurs brokers en une seule requête.
 * Body attendu : { userId, templateId, brokerIds: string[] }
 * Comportement partiel : si un broker est invalide, on continue avec les autres
 * et on signale l'échec dans le résultat.
 */
requestsRoutes.post('/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, templateId, brokerIds } = body

    // 1. Validation du body
    if (!userId || !templateId || !Array.isArray(brokerIds) || brokerIds.length === 0) {
      return c.json({
        error: "userId, templateId et brokerIds (tableau non vide) sont requis.",
        code: "BAD_REQUEST"
      }, 400)
    }

    if (!uuidRegex.test(userId) || !uuidRegex.test(templateId)) {
      return c.json({
        error: "userId et templateId doivent être des UUIDs valides.",
        code: "BAD_REQUEST"
      }, 400)
    }

    // 2. Vérifier que l'utilisateur existe
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userRows.length === 0) {
      return c.json({
        error: "Utilisateur introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    // 3. Vérifier que le template existe
    const templateRows = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, templateId))
      .limit(1)

    if (templateRows.length === 0) {
      return c.json({
        error: "Template introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    // 4. Traiter chaque broker un par un
    const created = []
    const failed = []

    for (const brokerId of brokerIds) {
      // Valider le format UUID du brokerId
      if (!uuidRegex.test(brokerId)) {
        failed.push({ brokerId, reason: "Format UUID invalide" })
        continue
      }

      // Vérifier que le broker existe
      const brokerRows = await db
        .select()
        .from(brokers)
        .where(eq(brokers.id, brokerId))
        .limit(1)

      if (brokerRows.length === 0) {
        failed.push({ brokerId, reason: "Broker introuvable" })
        continue
      }

      try {
        // Créer la demande en DRAFT
        const [newRequest] = await db
          .insert(removalRequests)
          .values({
            userId,
            brokerId,
            templateId,
            emailBody: "Généré automatiquement par le batch.",
          })
          .returning()

        // Ajouter dans la queue
        await emailQueue.add('send-request', {
          requestId: newRequest.id
        })

        console.log(`[POST /batch] Job ajouté pour la demande : ${newRequest.id}`)

        // Mettre à jour le statut SENT (cohérent avec POST /:id/send de Fabien)
        const [updatedRequest] = await db
          .update(removalRequests)
          .set({
            status: 'SENT',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(removalRequests.id, newRequest.id))
          .returning()

        created.push(updatedRequest)

      } catch (brokerError) {
        console.error(`[POST /batch] Erreur pour le broker ${brokerId} :`, brokerError)
        failed.push({ brokerId, reason: "Erreur lors de la création de la demande" })
      }
    }

    // 5. Réponse avec le récap complet
    return c.json({
      message: `${created.length} demande(s) créée(s) et mise(s) en file d'attente.`,
      data: {
        created: created.length,
        failed: failed.length,
        requests: created,
        errors: failed.length > 0 ? failed : undefined,
      }
    }, 201)

  } catch (error) {
    console.error("[POST /requests/batch] Erreur critique :", error)
    return c.json({
      error: "Erreur serveur lors du traitement du batch.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})

// ============================================================================
// FEATURE 14 : MISE À JOUR MANUELLE DU STATUT
// Route finale : PATCH /api/v1/requests/:id/status
// ============================================================================
const TRANSITIONS: Record<string, string[]> = {
  DRAFT:        ['SENT'],
  SENT:         ['ACKNOWLEDGED', 'NO_RESPONSE'],
  ACKNOWLEDGED: ['COMPLETED', 'REFUSED', 'SUPPRESSED'],
  REFUSED:      ['COMPLAINT'],
  NO_RESPONSE:  ['SENT', 'COMPLAINT'],
}

requestsRoutes.patch('/:id/status', async (c) => {
// FEATURE 13 : HISTORIQUE DES ÉVÉNEMENTS D'UNE DEMANDE
// Route finale : GET /api/v1/requests/:id/events
// ============================================================================
requestsRoutes.get('/:id/events', async (c) => {
  try {
    const requestId = c.req.param('id')

    if (!uuidRegex.test(requestId)) {
      return c.json({
        error: "Format d'identifiant invalide. Un UUID est attendu.",
        code: "BAD_REQUEST"
      }, 400)
    }

    let body: { status?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({
        error: "Corps de requête JSON invalide ou manquant.",
        code: "BAD_REQUEST"
      }, 400)
    }

    const { status: newStatus } = body

    if (!newStatus) {
      return c.json({
        error: "Le champ 'status' est requis.",
        code: "BAD_REQUEST"
      }, 400)
    }

    const rows = await db
      .select()
    const request = await db
      .select({ id: removalRequests.id })
      .from(removalRequests)
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (rows.length === 0) {
    if (request.length === 0) {
      return c.json({
        error: "La demande spécifiée est introuvable.",
        code: "NOT_FOUND"
      }, 404)
    }

    const request = rows[0]
    const oldStatus = request.status
    const allowed = TRANSITIONS[oldStatus] ?? []

    if (!allowed.includes(newStatus)) {
      return c.json({
        error: `Transition invalide : ${oldStatus} → ${newStatus}. Transitions autorisées : ${allowed.join(', ') || 'aucune'}.`,
        code: "BAD_REQUEST"
      }, 400)
    }

    const [updated] = await db
      .update(removalRequests)
      .set({
        status: newStatus,
        respondedAt: ['ACKNOWLEDGED', 'COMPLETED', 'REFUSED'].includes(newStatus) ? new Date() : request.respondedAt,
        updatedAt: new Date(),
      })
      .where(eq(removalRequests.id, requestId))
      .returning()

    await db.insert(requestEvents).values({
      requestId,
      eventType: 'status_changed',
      oldStatus,
      newStatus,
    })

    return c.json({ data: updated }, 200)

  } catch (error) {
    console.error(`[PATCH /requests/${c.req.param('id')}/status] Erreur :`, error)
    return c.json({
      error: "Erreur interne lors de la mise à jour du statut.",
    const events = await db
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, requestId))
      .orderBy(requestEvents.createdAt)

    return c.json({ data: events }, 200)

  } catch (error) {
    console.error(`[GET /requests/${c.req.param('id')}/events] Erreur :`, error)
    return c.json({
      error: "Erreur interne lors de la récupération des événements.",
      code: "INTERNAL_SERVER_ERROR"
    }, 500)
  }
})


export default requestsRoutes