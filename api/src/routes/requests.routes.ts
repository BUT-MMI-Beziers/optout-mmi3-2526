import { Hono } from 'hono'
import { eq, and, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, users, brokers, emailTemplates, userContacts, requestEvents } from '../db/schema.js'
import { renderTemplate } from '../services/template.service.js'
import { emailQueue } from '../services/queue.service.js'
import { authMiddleware } from './auth/auth.middleware.js'

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
requestsRoutes.get('/', authMiddleware, async (c) => {
  try {
    // Auth — userId extrait du cookie JWT
    const userId = c.get('userId') as string

    // 1. Récupérer et valider les query params
    const statusParam = c.req.query('status')
    const brokerIdParam = c.req.query('broker_id')
    const pageParam = c.req.query('page')
    const limitParam = c.req.query('limit')

    // Valider le statut si fourni
    const validStatuses = ['DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'REFUSED', 'NO_RESPONSE', 'COMPLAINT', 'SUPPRESSED']
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
    const conditions = [eq(removalRequests.userId, userId)]

    if (statusParam) {
      conditions.push(eq(removalRequests.status, statusParam as any))
    }

    if (brokerIdParam) {
      conditions.push(eq(removalRequests.brokerId, brokerIdParam))
    }

    // 3. Récupérer les demandes avec filtres + pagination
    const requestsList = await db
      .select({
        ...getTableColumns(removalRequests),
        brokerName: brokers.name,
        brokerUrl: brokers.website,
      })
      .from(removalRequests)
      .leftJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .where(and(...conditions))
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

    if (!uuidRegex.test(requestId)) {
      return c.json({
        error: "Format d'identifiant invalide",
        code: "BAD_REQUEST"
      }, 400)
    }

    const [request] = await db
      .select()
      .from(removalRequests)
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (!request) {
      return c.json({
        error: "Demande introuvable",
        code: "NOT_FOUND"
      }, 404)
    }

    if (request.status !== 'DRAFT') {
      return c.json({
        error: "La demande doit être DRAFT",
        code: "BAD_REQUEST"
      }, 400)
    }

    await emailQueue.add('send-request', {
      requestId: request.id
    })

    return c.json({
      message: "Ajouté à la queue",
      data: request
    })

  } catch (error) {
    console.error(error)
    return c.json({
      error: "server error"
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

requestsRoutes.post('/batch', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { templateId, brokerIds } = body
    const userId = c.get('userId') as string

    const created = []
    const failed = []

    for (const brokerId of brokerIds) {
      if (!uuidRegex.test(brokerId)) {
        failed.push({ brokerId, reason: "UUID invalide" })
        continue
      }

      const [broker] = await db
        .select()
        .from(brokers)
        .where(eq(brokers.id, brokerId))
        .limit(1)

      if (!broker) {
        failed.push({ brokerId, reason: "Broker introuvable" })
        continue
      }

      const [newRequest] = await db
        .insert(removalRequests)
        .values({
          userId,
          brokerId,
          templateId,
          status: 'DRAFT',
          emailBody: "generated",
        })
        .returning()

      // ❗ UNIQUEMENT QUEUE (PAS SENT ICI)
      await emailQueue.add(
        'send-request',
        { requestId: newRequest.id },
        {
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        }
      )

      created.push(newRequest)

      console.log(`[batch] queued ${newRequest.id}`)
    }

    return c.json({
      message: "Batch queued",
      data: {
        created,
        failed,
      }
    }, 201)

  } catch (e) {
    return c.json({ error: "server error" }, 500)
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
  try {
    const requestId = c.req.param('id')

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: 'UUID invalide', code: 'BAD_REQUEST' }, 400)
    }

    let body: any
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Body JSON invalide', code: 'BAD_REQUEST' }, 400)
    }

    const newStatus = body?.status

    if (!newStatus) {
      return c.json({ error: 'status requis', code: 'BAD_REQUEST' }, 400)
    }

    const [request] = await db
      .select()
      .from(removalRequests)
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (!request) {
      return c.json({ error: 'Request introuvable', code: 'NOT_FOUND' }, 404)
    }

    // ✅ IMPORTANT : oldStatus doit être défini ici
    const oldStatus = request.status

    // ✅ règle métier : transitions autorisées
    const allowed = TRANSITIONS[oldStatus] ?? []

    if (!allowed.includes(newStatus)) {
      return c.json({
        error: `Transition invalide ${oldStatus} → ${newStatus}`,
        code: 'BAD_REQUEST'
      }, 400)
    }

    const [updated] = await db
      .update(removalRequests)
      .set({
        status: newStatus,
        respondedAt: ['ACKNOWLEDGED', 'COMPLETED', 'REFUSED'].includes(newStatus)
          ? new Date()
          : request.respondedAt,
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

    return c.json({ data: updated })

  } catch (e) {
    return c.json({ error: 'server error' }, 500)
  }
})

requestsRoutes.get('/:id/events', async (c) => {
  try {
    const requestId = c.req.param('id')

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: 'UUID invalide' }, 400)
    }

    const events = await db
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, requestId))
      .orderBy(requestEvents.createdAt)

    return c.json({ data: events })
  } catch (e) {
    return c.json({ error: 'server error' }, 500)
  }
})


export default requestsRoutes