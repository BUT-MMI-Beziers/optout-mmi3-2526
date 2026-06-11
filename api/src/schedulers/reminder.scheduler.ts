import { lt, lte, eq, and, isNotNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { removalRequests, requestEvents, users, DEFAULT_PREFERENCES } from '../db/schema.js'
import { emailQueue } from '../services/queue.service.js'
import { notifyUser } from '../services/notification.service.js'

const DAY_MS = 24 * 60 * 60 * 1000

// ============================================================
// FEATURE 16 : SCHEDULER — Relance automatique
// Détecte les demandes SENT sans réponse depuis le délai choisi par
// l'utilisateur (préférence reminders.delayDays, 30j par défaut),
// les passe NO_RESPONSE, et envoie un email de relance.
// Respecte reminders.enabled : si l'utilisateur a coupé les relances
// automatiques, ses demandes sont ignorées.
// ============================================================

export async function runReminderScheduler() {
  console.log('[scheduler] Lancement du scheduler de relance automatique...')

  const now = new Date()

  // On joint users pour lire le délai et l'activation propres à chaque utilisateur,
  // puis on filtre en JS (le seuil dépend de la préférence, pas d'une constante globale).
  const candidates = await db
    .select({ request: removalRequests, preferences: users.preferences })
    .from(removalRequests)
    .innerJoin(users, eq(removalRequests.userId, users.id))
    .where(and(eq(removalRequests.status, 'SENT'), isNotNull(removalRequests.sentAt)))

  let dueCount = 0

  for (const { request, preferences } of candidates) {
    const prefs = preferences ?? DEFAULT_PREFERENCES
    if (!prefs.reminders.enabled) continue

    const delayMs = prefs.reminders.delayDays * DAY_MS
    if (!request.sentAt || now.getTime() - request.sentAt.getTime() < delayMs) continue

    dueCount++

    try {
      await db
        .update(removalRequests)
        .set({
          status: 'NO_RESPONSE',
          nextActionAt: new Date(now.getTime() + delayMs), // 2e étape (mise en demeure) au même rythme
          updatedAt: now,
        })
        .where(eq(removalRequests.id, request.id))

      await db.insert(requestEvents).values({
        requestId: request.id,
        eventType: 'status_changed',
        oldStatus: 'SENT',
        newStatus: 'NO_RESPONSE',
        note: `Aucune réponse reçue après ${prefs.reminders.delayDays} jours — relance automatique déclenchée`,
      })

      // Pass isReminder=true so the worker uses the relance template
      await emailQueue.add('send-request', {
        requestId: request.id,
        isReminder: true,
      })

      await notifyUser(request.userId, 'relance', {
        requestId: request.id,
        message: `Aucune réponse depuis ${prefs.reminders.delayDays} jours pour votre demande. Un email de relance a été envoyé automatiquement.`,
      })

      console.log(`[scheduler] Relance déclenchée pour ${request.id}`)
    } catch (error) {
      console.error(`[scheduler] Erreur pour la demande ${request.id} :`, error)
    }
  }

  console.log(`[scheduler] ${dueCount} relance(s) déclenchée(s). Scheduler terminé.`)
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

      await notifyUser(request.userId, 'relance', {
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

      await notifyUser(request.userId, 'relance', {
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
