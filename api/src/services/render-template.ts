import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  removalRequests,
  users,
  brokers,
  emailTemplates,
  userContacts,
} from '../db/schema.js'

// ============================================================
// SERVICE : renderRequestEmail
// Récupère une demande complète (user + broker + template + adresse)
// et retourne l'email final avec toutes les variables interpolées.
//
// Utilisé par :
//  - GET /requests/:id/preview  (Feature 6)
//  - Worker email-queue         (Feature 7)
// ============================================================

export type RenderedEmail = {
  subject: string
  body: string
  to: string         // email du broker (destinataire)
  requestId: string
}

export async function renderRequestEmail(requestId: string): Promise<RenderedEmail | null> {
  // 1. Récupérer la demande + user + broker + template (jointures)
  const rows = await db
    .select({
      request: removalRequests,
      user: users,
      broker: brokers,
      template: emailTemplates,
    })
    .from(removalRequests)
    .innerJoin(users, eq(removalRequests.userId, users.id))
    .innerJoin(brokers, eq(removalRequests.brokerId, brokers.id))
    .innerJoin(emailTemplates, eq(removalRequests.templateId, emailTemplates.id))
    .where(eq(removalRequests.id, requestId))
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  const data = rows[0]

  // 2. Récupérer l'adresse principale de l'utilisateur
  const addressRows = await db
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

  const userAddress = addressRows.length > 0
    ? addressRows[0].value
    : '[Adresse non renseignée]'

  // 3. Calculer les dates (date de la demande + deadline légale 30j)
  const requestDate = new Date(data.request.createdAt).toLocaleDateString('fr-FR')

  const deadline = new Date(data.request.createdAt)
  deadline.setDate(deadline.getDate() + 30)
  const deadlineDate = deadline.toLocaleDateString('fr-FR')

  // 4. Fonction d'interpolation (remplace {{var}} par la vraie valeur)
  const interpolate = (text: string): string => {
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

  return {
    subject: interpolate(data.template.subject),
    body: interpolate(data.template.body),
    to: data.broker.emailContact,
    requestId: data.request.id,
  }
}