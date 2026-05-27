import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db' // Vérifie bien que ce chemin correspond à ton export db
import { removalRequests, users, brokers, emailTemplates, userContacts } from '../db/schema'

export const requestsRoutes = new Hono()

// ============================================================================
// PRÉVISUALISATION D'UNE DEMANDE
// Route finale : GET /api/v1/requests/:id/preview
// ============================================================================
/*
 * TODO (SÉCURITÉ) : Route temporairement publique. 
 * L'équipe Bleue (les gnomes) devra ajouter le middleware d'authentification 
 * quand ils auront fini leur module !
 * Utilité : Retourne l'email final avec toutes les variables remplacées, sans envoyer.
 */
requestsRoutes.get('/:id/preview', async (c) => {
  try {
    const requestId = c.req.param('id')

    // 1. Récupération de la demande avec ses relations (Jointures)
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

    // Gestion de l'erreur 404
    if (requestData.length === 0) {
      return c.json({
        error: "Demande introuvable",
        code: "NOT_FOUND",
        details: {}
      }, 404)
    }

    const data = requestData[0]

    // 2. Récupération de l'adresse principale de l'utilisateur (si elle existe)
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

    // 3. Formatage des dates utiles
    const requestDate = new Date(data.request.createdAt).toLocaleDateString('fr-FR')
    
    // Calcul de la date limite (ex: +30 jours selon le RGPD)
    const deadline = new Date(data.request.createdAt)
    deadline.setDate(deadline.getDate() + 30)
    const deadlineDate = deadline.toLocaleDateString('fr-FR')

    // 4. Moteur d'interpolation (Remplacement des balises)
    const interpolate = (text: string) => {
      if (!text) return ''
      return text
        .replace(/{{user\.first_name}}/g, data.user.firstName || '')
        .replace(/{{user\.last_name}}/g, data.user.lastName || '')
        .replace(/{{user\.email}}/g, data.user.email || '')
        .replace(/{{user\.address}}/g, userAddress)
        .replace(/{{broker\.name}}/g, data.broker.name || '')
        .replace(/{{broker\.email_contact}}/g, data.broker.emailContact || '')
        .replace(/{{request\.date}}/g, requestDate)
        .replace(/{{request\.deadline_date}}/g, deadlineDate)
        .replace(/{{request\.id}}/g, data.request.id)
    }

    // 5. Application du remplacement sur le sujet et le corps du mail
    const previewSubject = interpolate(data.template.subject)
    const previewBody = interpolate(data.template.body)

    // 6. Renvoi des données générées
    return c.json({
      data: {
        subject: previewSubject,
        body: previewBody
      }
    }, 200)

  } catch (error) {
    console.error("Erreur lors de la prévisualisation :", error)
    return c.json({
      error: "Une erreur interne est survenue",
      code: "INTERNAL_SERVER_ERROR",
      details: error instanceof Error ? error.message : {}
    }, 500)
  }
})

// ============================================================================
// LISTER TOUTES LES DEMANDES
// Route finale : GET /api/v1/requests
// ============================================================================
/*
 * TODO (SÉCURITÉ) : Route temporairement publique.
 * À protéger avec le middleware d'authentification plus tard.
 * Utilité : Récupère la liste de toutes les requêtes (demandes d'opt-out) en base.
 */
requestsRoutes.get('/', async (c) => {
  try {
    // Récupération simple de toutes les demandes
    const requestsList = await db
      .select()
      .from(removalRequests)

    return c.json({
      data: requestsList,
      count: requestsList.length
    }, 200)

  } catch (error) {
    console.error("Erreur lors de la récupération des demandes :", error)
    return c.json({
      error: "Une erreur interne est survenue",
      code: "INTERNAL_SERVER_ERROR",
      details: error instanceof Error ? error.message : {}
    }, 500)
  }
})