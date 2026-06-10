import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import { eq, and, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, users, brokers, emailTemplates, userContacts, requestEvents, notifications } from '../db/schema.js'
import { renderTemplate } from '../services/template.service.js'
import { safeDecrypt } from '../utils/crypto.util.js'
import { emailQueue } from '../services/queue.service.js'
import { authMiddleware } from './auth/auth.middleware.js'

export const requestsRoutes = new Hono()

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ============================================================================
// FEATURE 11 : LISTER LES DEMANDES AVEC FILTRES ET PAGINATION
// Route finale : GET /api/v1/requests
// ============================================================================

requestsRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as string

    const statusParam = c.req.query('status')
    const brokerIdParam = c.req.query('broker_id')
    const pageParam = c.req.query('page')
    const limitParam = c.req.query('limit')

    const validStatuses = ['DRAFT', 'PENDING', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'REFUSED', 'NO_RESPONSE', 'COMPLAINT', 'SUPPRESSED']
    if (statusParam && !validStatuses.includes(statusParam)) {
      return c.json({ error: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`, code: 'BAD_REQUEST' }, 400)
    }

    if (brokerIdParam && !uuidRegex.test(brokerIdParam)) {
      return c.json({ error: 'broker_id doit être un UUID valide.', code: 'BAD_REQUEST' }, 400)
    }

    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '10')))
    const offset = (page - 1) * limit

    const conditions = [eq(removalRequests.userId, userId)]
    if (statusParam) conditions.push(eq(removalRequests.status, statusParam as any))
    if (brokerIdParam) conditions.push(eq(removalRequests.brokerId, brokerIdParam))

    const requestsList = await db
      .select({
        ...getTableColumns(removalRequests),
        brokerName: brokers.name,
        brokerUrl: brokers.website,
        brokerCategory: brokers.category,
      })
      .from(removalRequests)
      .leftJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .where(and(...conditions))
      .orderBy(removalRequests.createdAt)
      .limit(limit)
      .offset(offset)

    const allRequests = await db
      .select({ id: removalRequests.id })
      .from(removalRequests)
      .where(and(...conditions))

    const total = allRequests.length
    const totalPages = Math.ceil(total / limit)

    return c.json({ data: requestsList, total, page, limit, totalPages }, 200)

  } catch (error) {
    console.error('[GET /requests] Erreur critique :', error)
    return c.json({ error: 'Impossible de récupérer la liste des demandes.', code: 'INTERNAL_SERVER_ERROR' }, 500)
  }
})

// ============================================================================
// FEATURE 19 : CRÉER UNE DEMANDE (DRAFT)
// Route finale : POST /api/v1/requests
// ============================================================================

requestsRoutes.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId') as string
    const body = await c.req.json()
    const { brokerId, templateId, scheduledAt } = body

    if (!brokerId || !templateId) {
      return c.json({ error: 'Les champs brokerId et templateId sont obligatoires.', code: 'BAD_REQUEST' }, 400)
    }
    if (!uuidRegex.test(brokerId)) {
      return c.json({ error: 'brokerId doit être un UUID valide.', code: 'BAD_REQUEST' }, 400)
    }
    if (!uuidRegex.test(templateId)) {
      return c.json({ error: 'templateId doit être un UUID valide.', code: 'BAD_REQUEST' }, 400)
    }

    const [broker] = await db.select().from(brokers).where(eq(brokers.id, brokerId)).limit(1)
    if (!broker) {
      return c.json({ error: 'Le broker spécifié est introuvable.', code: 'NOT_FOUND' }, 404)
    }

    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, templateId)).limit(1)
    if (!template) {
      return c.json({ error: 'Le template spécifié est introuvable.', code: 'NOT_FOUND' }, 404)
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      return c.json({ error: 'Utilisateur introuvable.', code: 'NOT_FOUND' }, 404)
    }

    const [addressRow] = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, userId), eq(userContacts.type, 'address'), eq(userContacts.isPrimary, true)))
      .limit(1)

    const userAddress = addressRow?.value ? safeDecrypt(addressRow.value) : '[Adresse non renseignée]'

    // Pré-générer l'ID pour l'injecter dans {{request.id}} dès la création
    const requestId = randomUUID()
    const now = new Date()

    const context = {
      user: {
        firstName: safeDecrypt(user.firstName),
        lastName: safeDecrypt(user.lastName),
        email: user.email,
      },
      userAddress,
      broker: { name: broker.name, emailContact: broker.emailContact },
      request: { id: requestId, createdAt: now, referenceDate: now },
      language: template.language,
    }

    const emailBody = renderTemplate(template.body, context)

    const [newRequest] = await db.insert(removalRequests).values({
      id: requestId,
      userId,
      brokerId,
      templateId,
      status: 'DRAFT',
      emailBody,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    }).returning()

    await db.insert(requestEvents).values({
      requestId: newRequest.id,
      eventType: 'created',
      newStatus: 'DRAFT',
      note: `Demande créée — broker : ${broker.name}, template : ${template.name}`,
    })

    return c.json({ data: newRequest }, 201)

  } catch (error) {
    console.error('[POST /requests] Erreur critique :', error)
    return c.json({ error: 'Impossible de créer la demande.', code: 'INTERNAL_SERVER_ERROR' }, 500)
  }
})


// ============================================================================
// FEATURE 12 : DÉTAIL COMPLET D'UNE DEMANDE
// Route finale : GET /api/v1/requests/:id
// ============================================================================

requestsRoutes.get('/:id', async (c) => {
  try {
    const requestId = c.req.param('id')

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: "Format d'identifiant de demande invalide. Un UUID est attendu.", code: 'BAD_REQUEST' }, 400)
    }

    const rows = await db
      .select({ request: removalRequests, broker: brokers, template: emailTemplates })
      .from(removalRequests)
      .innerJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .innerJoin(emailTemplates, eq(removalRequests.templateId, emailTemplates.id))
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (rows.length === 0) {
      return c.json({ error: 'La demande spécifiée est introuvable.', code: 'NOT_FOUND' }, 404)
    }

    const data = rows[0]

    const events = await db
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, requestId))
      .orderBy(requestEvents.createdAt)

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
    return c.json({ error: 'Une erreur interne est survenue lors de la récupération de la demande.', code: 'INTERNAL_SERVER_ERROR' }, 500)
  }
})

// ============================================================================
// FEATURE 6/3 : PRÉVISUALISATION D'UNE DEMANDE
// Route finale : GET /api/v1/requests/:id/preview
// ============================================================================

requestsRoutes.get('/:id/preview', async (c) => {
  try {
    const requestId = c.req.param('id')

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: "Format d'identifiant de demande invalide. Un UUID est attendu.", code: 'BAD_REQUEST' }, 400)
    }

    const requestData = await db
      .select({ request: removalRequests, user: users, broker: brokers, template: emailTemplates })
      .from(removalRequests)
      .innerJoin(users, eq(removalRequests.userId, users.id))
      .innerJoin(brokers, eq(removalRequests.brokerId, brokers.id))
      .innerJoin(emailTemplates, eq(removalRequests.templateId, emailTemplates.id))
      .where(eq(removalRequests.id, requestId))
      .limit(1)

    if (requestData.length === 0) {
      return c.json({ error: 'La demande de suppression spécifiée est introuvable.', code: 'NOT_FOUND' }, 404)
    }

    const data = requestData[0]

    const addressData = await db
      .select()
      .from(userContacts)
      .where(and(eq(userContacts.userId, data.user.id), eq(userContacts.type, 'address'), eq(userContacts.isPrimary, true)))
      .limit(1)

    const userAddress = addressData.length > 0 ? safeDecrypt(addressData[0].value) : '[Adresse non renseignée]'

    const context = {
      user: { firstName: safeDecrypt(data.user.firstName), lastName: safeDecrypt(data.user.lastName), email: data.user.email },
      userAddress,
      broker: { name: data.broker.name, emailContact: data.broker.emailContact },
      request: {
        id: data.request.id,
        createdAt: data.request.createdAt,
        sentAt: data.request.sentAt,
      },
      language: data.template.language,
    }

    return c.json({
      data: {
        subject: renderTemplate(data.template.subject, context),
        body: renderTemplate(data.template.body, context),
      }
    }, 200)

  } catch (error) {
    console.error(`[GET /requests/${c.req.param('id')}/preview] Erreur critique :`, error)
    return c.json({ error: 'Une erreur interne est survenue lors de la prévisualisation de la demande.', code: 'INTERNAL_SERVER_ERROR' }, 500)
  }
})

// ============================================================================
// FEATURE 9 : ENVOI D'UNE DEMANDE (Mise en file d'attente)
// Route finale : POST /api/v1/requests/:id/send
// DRAFT → PENDING (scheduledAt = now) puis worker → SENT
// ============================================================================

requestsRoutes.post('/:id/send', authMiddleware, async (c) => {
  try {
    const requestId = c.req.param('id')
    const userId = c.get('userId') as string

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: "Format d'identifiant invalide", code: 'BAD_REQUEST' }, 400)
    }

    const [request] = await db
      .select()
      .from(removalRequests)
      .where(and(eq(removalRequests.id, requestId), eq(removalRequests.userId, userId)))
      .limit(1)

    if (!request) {
      return c.json({ error: 'Demande introuvable', code: 'NOT_FOUND' }, 404)
    }

    if (request.status !== 'DRAFT') {
      return c.json({ error: 'La demande doit être en statut DRAFT pour être envoyée', code: 'BAD_REQUEST' }, 400)
    }

    const now = new Date()

    const [updated] = await db
      .update(removalRequests)
      .set({ status: 'PENDING', scheduledAt: now, updatedAt: now })
      .where(eq(removalRequests.id, requestId))
      .returning()

    await db.insert(requestEvents).values({
      requestId,
      eventType: 'status_changed',
      oldStatus: 'DRAFT',
      newStatus: 'PENDING',
      note: 'Demande mise en file d\'envoi',
    })

    await emailQueue.add('send-request', { requestId }, { attempts: 3, removeOnComplete: true, removeOnFail: false })

    return c.json({ message: 'Ajouté à la queue', data: updated })

  } catch (error) {
    console.error(error)
    return c.json({ error: 'server error' }, 500)
  }
})

// ============================================================================
// FEATURE 10 : ENVOI EN MASSE (BATCH)
// Route finale : POST /api/v1/requests/batch
// Crée les demandes en DRAFT puis les passe PENDING + queue
// ============================================================================

requestsRoutes.post('/batch', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { templateId, brokerIds } = body
    const userId = c.get('userId') as string

    if (!templateId || !Array.isArray(brokerIds) || brokerIds.length === 0) {
      return c.json({ error: 'templateId et brokerIds[] requis', code: 'BAD_REQUEST' }, 400)
    }

    const created = []
    const failed = []
    const now = new Date()

    for (const brokerId of brokerIds) {
      if (!uuidRegex.test(brokerId)) {
        failed.push({ brokerId, reason: 'UUID invalide' })
        continue
      }

      const [broker] = await db.select().from(brokers).where(eq(brokers.id, brokerId)).limit(1)
      if (!broker) {
        failed.push({ brokerId, reason: 'Broker introuvable' })
        continue
      }

      // Check: no existing active request for this broker
      const [existing] = await db
        .select({ id: removalRequests.id })
        .from(removalRequests)
        .where(
          and(
            eq(removalRequests.userId, userId),
            eq(removalRequests.brokerId, brokerId),
            eq(removalRequests.status, 'PENDING'),
          )
        )
        .limit(1)

      if (existing) {
        failed.push({ brokerId, reason: 'Une demande PENDING existe déjà pour ce broker' })
        continue
      }

      // Create as DRAFT first, then immediately move to PENDING
      const [newRequest] = await db
        .insert(removalRequests)
        .values({
          userId,
          brokerId,
          templateId,
          status: 'PENDING',
          scheduledAt: now,
          emailBody: 'generated',
        })
        .returning()

      await db.insert(requestEvents).values({
        requestId: newRequest.id,
        eventType: 'created',
        note: 'Demande créée et mise en file d\'envoi',
      })

      await emailQueue.add(
        'send-request',
        { requestId: newRequest.id },
        { attempts: 3, removeOnComplete: true, removeOnFail: false }
      )

      created.push(newRequest)
      console.log(`[batch] queued ${newRequest.id}`)
    }

    return c.json({
      message: 'Batch queued',
      data: { created, failed },
    }, 201)

  } catch (e) {
    console.error('[batch] error:', e)
    return c.json({ error: 'server error' }, 500)
  }
})

// ============================================================================
// CANCEL : Annuler une demande DRAFT ou PENDING
// Route finale : DELETE /api/v1/requests/:id
// ============================================================================

requestsRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const requestId = c.req.param('id')
    const userId = c.get('userId') as string

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: 'UUID invalide', code: 'BAD_REQUEST' }, 400)
    }

    const [request] = await db
      .select()
      .from(removalRequests)
      .where(and(eq(removalRequests.id, requestId), eq(removalRequests.userId, userId)))
      .limit(1)

    if (!request) {
      return c.json({ error: 'Demande introuvable', code: 'NOT_FOUND' }, 404)
    }

    const cancellable = ['DRAFT', 'PENDING']
    if (!cancellable.includes(request.status)) {
      return c.json({
        error: `Impossible d'annuler une demande en statut ${request.status}. Seules les demandes DRAFT ou PENDING peuvent être annulées.`,
        code: 'BAD_REQUEST',
      }, 400)
    }

    // Annulation = suppression. Vaut pour un brouillon, un envoi initial en file,
    // ou une relance programmée (qui est une demande PENDING distincte, pas encore envoyée).
    // La demande initiale liée (parentRequestId) n'est pas touchée.
    const isRelance = request.parentRequestId !== null

    if (isRelance) {
      await db.insert(requestEvents).values({
        requestId: request.parentRequestId!,
        eventType: 'note_added',
        note: 'Relance programmée annulée par l\'utilisateur',
      })
    }

    await db.delete(removalRequests).where(eq(removalRequests.id, requestId))

    return c.json({ message: isRelance ? 'Relance annulée' : 'Demande annulée et supprimée' }, 200)

  } catch (e) {
    console.error('[DELETE /requests/:id] error:', e)
    return c.json({ error: 'server error' }, 500)
  }
})

// ============================================================================
// FEATURE 14 : MISE À JOUR MANUELLE DU STATUT
// Route finale : PATCH /api/v1/requests/:id/status
// ============================================================================

const TRANSITIONS: Record<string, string[]> = {
  DRAFT:        ['PENDING'],
  PENDING:      ['SENT'],          // handled by worker normally, but allowed manually
  SENT:         ['ACKNOWLEDGED', 'NO_RESPONSE'],
  ACKNOWLEDGED: ['COMPLETED', 'REFUSED', 'SUPPRESSED'],
  REFUSED:      ['COMPLAINT'],
  NO_RESPONSE:  ['SENT', 'COMPLAINT'],
}

requestsRoutes.patch('/:id/status', authMiddleware, async (c) => {
  try {
    const requestId = c.req.param('id')
    const userId = c.get('userId') as string

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
      .where(and(eq(removalRequests.id, requestId), eq(removalRequests.userId, userId)))
      .limit(1)

    if (!request) {
      return c.json({ error: 'Request introuvable', code: 'NOT_FOUND' }, 404)
    }

    const oldStatus = request.status
    const allowed = TRANSITIONS[oldStatus] ?? []

    if (!allowed.includes(newStatus)) {
      return c.json({ error: `Transition invalide ${oldStatus} → ${newStatus}`, code: 'BAD_REQUEST' }, 400)
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

    const terminalMessages: Record<string, string> = {
      COMPLETED: 'Votre demande a été complétée : le broker a confirmé la suppression de vos données.',
      REFUSED: 'Votre demande a été refusée par le broker. Vous pouvez déposer une plainte auprès de la CNIL (www.cnil.fr).',
      SUPPRESSED: 'Vous avez été ajouté à la liste de suppression du broker.',
    }
    
    if (terminalMessages[newStatus]) {
      await db.insert(notifications).values({
        userId,
        requestId,
        message: terminalMessages[newStatus],
      })
    }


    return c.json({ data: updated })

  } catch (e) {
    return c.json({ error: 'server error' }, 500)
  }
})

// ============================================================================
// EVENTS : Journal d'audit d'une demande
// Route finale : GET /api/v1/requests/:id/events
// ============================================================================

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

// ============================================================================
// REMIND : Programmer une relance manuelle
// Route finale : POST /api/v1/requests/:id/remind
// ============================================================================

const ALLOWED_REMINDER_DELAYS = [3, 7, 15, 30]

requestsRoutes.post('/:id/remind', authMiddleware, async (c) => {
  try {
    const requestId = c.req.param('id')
    const userId = c.get('userId') as string

    if (!uuidRegex.test(requestId)) {
      return c.json({ error: 'UUID invalide', code: 'BAD_REQUEST' }, 400)
    }

    let body: any
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Body JSON invalide', code: 'BAD_REQUEST' }, 400)
    }

    const delayDays = Number(body?.delayDays)
    if (!ALLOWED_REMINDER_DELAYS.includes(delayDays)) {
      return c.json({ error: `delayDays doit être l'un de ${ALLOWED_REMINDER_DELAYS.join(', ')}`, code: 'BAD_REQUEST' }, 400)
    }

    const [request] = await db
      .select()
      .from(removalRequests)
      .where(and(eq(removalRequests.id, requestId), eq(removalRequests.userId, userId)))
      .limit(1)

    if (!request) {
      return c.json({ error: 'Demande introuvable', code: 'NOT_FOUND' }, 404)
    }

    if (!['SENT', 'NO_RESPONSE'].includes(request.status)) {
      return c.json({ error: 'Une relance ne peut être programmée que pour les demandes SENT ou NO_RESPONSE', code: 'BAD_REQUEST' }, 400)
    }

    const now = new Date()
    const scheduledAt = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000)

    // Une relance est une NOUVELLE demande, liée à la demande initiale (parentRequestId).
    // La demande initiale reste inchangée (SENT/NO_RESPONSE) ; la relance apparaît comme
    // une ligne PENDING distincte, en file, annulable tant qu'elle n'est pas partie.
    const [relance] = await db
      .insert(removalRequests)
      .values({
        userId,
        brokerId: request.brokerId,
        templateId: request.templateId,
        parentRequestId: request.id,
        status: 'PENDING',
        scheduledAt,
        emailBody: 'generated',
      })
      .returning()

    await db.insert(requestEvents).values({
      requestId: relance.id,
      eventType: 'created',
      note: `Relance programmée pour le ${scheduledAt.toISOString().slice(0, 10)} (dans ${delayDays} jours)`,
    })

    // Tracer aussi sur la demande initiale pour l'historique.
    await db.insert(requestEvents).values({
      requestId: request.id,
      eventType: 'note_added',
      note: `Relance programmée pour le ${scheduledAt.toISOString().slice(0, 10)}`,
    })

    return c.json({ data: relance }, 201)

  } catch (e) {
    console.error('[POST /requests/:id/remind] Erreur :', e)
    return c.json({ error: 'Erreur serveur', code: 'INTERNAL_SERVER_ERROR' }, 500)
  }
})

export default requestsRoutes
