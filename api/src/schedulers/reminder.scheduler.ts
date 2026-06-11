import { lt, lte, eq, and, isNotNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, requestEvents, notifications } from '../db/schema.js'
import { emailQueue } from '../services/queue.service.js'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// ============================================================
// FEATURE 16 : SCHEDULER — Relance automatique 30j
// Détecte les demandes SENT sans réponse depuis 30j,
// les passe NO_RESPONSE, et envoie un email de relance
// (isReminder=true → le worker cherche le template 'relance').
// ============================================================

export async function runReminderScheduler() {
  console.log('[scheduler] Lancement du scheduler de relance 30j...')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS)

  const staleRequests = await db
    .select()
    .from(removalRequests)
    .where(
      and(
        eq(removalRequests.status, 'SENT'),
        lt(removalRequests.sentAt, thirtyDaysAgo)
      )
    )

  console.log(`[scheduler] ${staleRequests.length} demande(s) sans réponse depuis 30j`)

  for (const request of staleRequests) {
    try {
      await db
        .update(removalRequests)
        .set({
          status: 'NO_RESPONSE',
          nextActionAt: new Date(now.getTime() + THIRTY_DAYS_MS), // used by 60d scheduler
          updatedAt: now,
        })
        .where(eq(removalRequests.id, request.id))

      await db.insert(requestEvents).values({
        requestId: request.id,
        eventType: 'status_changed',
        oldStatus: 'SENT',
        newStatus: 'NO_RESPONSE',
        note: 'Aucune réponse reçue après 30 jours — relance automatique déclenchée',
      })

      // Pass isReminder=true so the worker uses the relance template
      await emailQueue.add('send-request', {
        requestId: request.id,
        isReminder: true,
      })

      await db.insert(notifications).values({
        userId: request.userId,
        requestId: request.id,
        message: 'Aucune réponse depuis 30 jours pour votre demande. Un email de relance a été envoyé automatiquement.',
      })

      console.log(`[scheduler] Relance 30j déclenchée pour ${request.id}`)
    } catch (error) {
      console.error(`[scheduler] Erreur pour la demande ${request.id} :`, error)
    }
  }

  console.log('[scheduler] Scheduler 30j terminé.')
}

// ============================================================
// FEATURE 17 : SCHEDULER — Notification mise en demeure 60j
// Détecte les demandes NO_RESPONSE dont nextActionAt est dépassé
// (= 60j après l'envoi initial).
// Ne change PAS le statut automatiquement — notifie l'utilisateur
// pour qu'il dépose lui-même une plainte (CNIL ou autre).
// ============================================================

export async function runFormalNoticeScheduler() {
  console.log('[scheduler] Lancement du scheduler de mise en demeure 60j...')

  const now = new Date()

  const overdueRequests = await db
    .select()
    .from(removalRequests)
    .where(
      and(
        eq(removalRequests.status, 'NO_RESPONSE'),
        lt(removalRequests.nextActionAt, now)
      )
    )

  console.log(`[scheduler] ${overdueRequests.length} demande(s) en attente de mise en demeure`)

  for (const request of overdueRequests) {
    try {
      // Log the event without auto-transitioning — user must file the complaint manually
      await db.insert(requestEvents).values({
        requestId: request.id,
        eventType: 'note_added',
        note: 'Délai de 60 jours dépassé — une mise en demeure peut être déposée (CNIL ou équivalent)',
      })

      await db.insert(notifications).values({
        userId: request.userId,
        requestId: request.id,
        message: 'Votre demande est sans réponse depuis plus de 60 jours. Vous pouvez désormais déposer une mise en demeure ou une plainte auprès de la CNIL (www.cnil.fr).',
      })

      // Clear nextActionAt to avoid re-notifying every day
      await db
        .update(removalRequests)
        .set({ nextActionAt: null, updatedAt: now })
        .where(eq(removalRequests.id, request.id))

      console.log(`[scheduler] Notification mise en demeure créée pour ${request.id}`)
    } catch (error) {
      console.error(`[scheduler] Erreur pour la demande ${request.id} :`, error)
    }
  }

  console.log('[scheduler] Scheduler 60j terminé.')
}

// ============================================================
// FEATURE 18 : SCHEDULER — Relances programmées
// Une relance programmée est une demande PENDING distincte, liée à une
// demande initiale (parentRequestId non nul), dont scheduledAt est échu.
// On l'ajoute à la file d'envoi ; le worker la passera en SENT.
// ============================================================

export async function runManualReminderScheduler() {
  console.log('[scheduler] Relances programmées dues...')

  const now = new Date()

  const dueRequests = await db
    .select()
    .from(removalRequests)
    .where(
      and(
        eq(removalRequests.status, 'PENDING'),
        isNotNull(removalRequests.parentRequestId), // relance (pas un envoi initial)
        isNotNull(removalRequests.scheduledAt),
        lte(removalRequests.scheduledAt, now)
      )
    )

  console.log(`[scheduler] ${dueRequests.length} relance(s) programmée(s) due(s)`)

  for (const request of dueRequests) {
    try {
      await emailQueue.add('send-request', {
        requestId: request.id,
        isReminder: true,
      })

      await db.insert(notifications).values({
        userId: request.userId,
        requestId: request.id,
        message: 'Votre relance programmée a été envoyée au broker.',
      })

      // Vider scheduledAt pour ne pas re-déclencher au prochain passage.
      // Le statut reste PENDING jusqu'à ce que le worker confirme l'envoi (→ SENT).
      await db
        .update(removalRequests)
        .set({ scheduledAt: null, updatedAt: now })
        .where(eq(removalRequests.id, request.id))

    } catch (error) {
      console.error(`[scheduler] Erreur relance programmée ${request.id} :`, error)
    }
  }

  console.log('[scheduler] Relances programmées terminées.')
}
