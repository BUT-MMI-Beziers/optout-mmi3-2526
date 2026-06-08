import { Worker } from 'bullmq'
import { Queue } from 'bullmq'
import { lt, eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, requestEvents, notifications } from '../db/schema.js'
import { emailQueue } from '../services/queue.service.js'

// ============================================================
// FEATURE 16 : SCHEDULER — Relance automatique 30j
// ============================================================
/*
 * Logique :
 *  - Toutes les 24h, détecte les demandes en statut SENT
 *    dont sentAt > 30 jours et nextActionAt est null ou dépassé
 *  - Pour chacune :
 *    1. Passe le statut à NO_RESPONSE
 *    2. Logue un request_event 'status_changed'
 *    3. Remet un job dans emailQueue pour renvoyer l'email
 *    4. Crée une notification in-app pour l'utilisateur
 *    5. Met à jour nextActionAt à maintenant + 30j (pour F17)
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

export async function runReminderScheduler() {
  console.log('[scheduler] Lancement du scheduler de relance 30j...')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS)

  // 1. Trouver les demandes SENT depuis plus de 30j sans réponse
  const staleRequests = await db
    .select()
    .from(removalRequests)
    .where(
      and(
        eq(removalRequests.status, 'SENT'),
        lt(removalRequests.sentAt, thirtyDaysAgo)
      )
    )

  console.log(`[scheduler] ${staleRequests.length} demande(s) sans réponse depuis 30j détectée(s)`)

  for (const request of staleRequests) {
    try {
      // 2. Passer le statut à NO_RESPONSE
      await db
        .update(removalRequests)
        .set({
          status: 'NO_RESPONSE',
          nextActionAt: new Date(now.getTime() + THIRTY_DAYS_MS), // +30j pour F17
          updatedAt: now,
        })
        .where(eq(removalRequests.id, request.id))

      // 3. Logger l'événement (audit RGPD)
      await db.insert(requestEvents).values({
        requestId: request.id,
        eventType: 'status_changed',
        oldStatus: 'SENT',
        newStatus: 'NO_RESPONSE',
        note: 'Aucune réponse reçue après 30 jours — relance automatique déclenchée',
      })

      // 4. Remettre dans la queue pour renvoyer l'email de relance
      await emailQueue.add('send-request', {
        requestId: request.id,
      })

      console.log(`[scheduler] Job de relance ajouté pour la demande ${request.id}`)

      // 5. Créer une notification in-app pour l'utilisateur
      await db.insert(notifications).values({
        userId: request.userId,
        requestId: request.id,
        message: `Aucune réponse reçue depuis 30 jours pour votre demande auprès de ce broker. Un email de relance a été envoyé automatiquement.`,
      })

    } catch (error) {
      console.error(`[scheduler] Erreur pour la demande ${request.id} :`, error)
      // On continue avec les autres demandes même si une échoue
    }
  }

  console.log('[scheduler] Scheduler 30j terminé.')
}
// ============================================================
// FEATURE 17 : SCHEDULER — Mise en demeure automatique 60j
// ============================================================
/*
 * Logique :
 *  - Toutes les 24h, détecte les demandes en statut NO_RESPONSE
 *    dont nextActionAt est dépassé (= 60j après l'envoi initial)
 *  - Pour chacune :
 *    1. Passe le statut à COMPLAINT
 *    2. Logge un request_event 'status_changed'
 *    3. Crée une notification de mise en demeure pour l'utilisateur
 */
export async function runFormalNoticeScheduler() {
  console.log('[scheduler] Lancement du scheduler de mise en demeure 60j...')

  const now = new Date()

  // Trouver les demandes NO_RESPONSE dont nextActionAt est dépassé
  const overdueRequests = await db
    .select()
    .from(removalRequests)
    .where(
      and(
        eq(removalRequests.status, 'NO_RESPONSE'),
        lt(removalRequests.nextActionAt, now)
      )
    )

  console.log(`[scheduler] ${overdueRequests.length} demande(s) en mise en demeure détectée(s)`)

  for (const request of overdueRequests) {
    try {
      // 1. Passer le statut à COMPLAINT
      await db
        .update(removalRequests)
        .set({
          status: 'COMPLAINT',
          updatedAt: now,
        })
        .where(eq(removalRequests.id, request.id))

      // 2. Logger l'événement (audit RGPD)
      await db.insert(requestEvents).values({
        requestId: request.id,
        eventType: 'status_changed',
        oldStatus: 'NO_RESPONSE',
        newStatus: 'COMPLAINT',
        note: 'Aucune réponse reçue après 60 jours — mise en demeure déclenchée automatiquement',
      })

      // 3. Notification de mise en demeure pour l'utilisateur
      await db.insert(notifications).values({
        userId: request.userId,
        requestId: request.id,
        message: `Votre demande est sans réponse depuis plus de 60 jours. Vous pouvez désormais déposer une plainte auprès de la CNIL (www.cnil.fr).`,
      })

      console.log(`[scheduler] Mise en demeure créée pour la demande ${request.id}`)

    } catch (error) {
      console.error(`[scheduler] Erreur pour la demande ${request.id} :`, error)
    }
  }

  console.log('[scheduler] Scheduler 60j terminé.')
}