import { Worker, Job, DelayedError } from 'bullmq'
import { Redis } from 'ioredis'
import nodemailer from 'nodemailer'
import { eq, and, ilike } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  removalRequests,
  users,
  brokers,
  emailTemplates,
  userContacts,
  requestEvents,
} from '../db/schema.js'
import { renderTemplate } from '../services/template.service.js'
import { safeDecrypt } from '../utils/crypto.util.js'

const redisUrl = new URL(process.env.REDIS_URL || 'redis://redis:6379')
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
}

// Client Redis dédié au throttle PAR UTILISATEUR (indépendant de BullMQ).
const redis = new Redis({
  host: connection.host,
  port: connection.port,
  maxRetriesPerRequest: null,
})

// Limite d'envoi PAR UTILISATEUR : au plus 1 email toutes les PER_USER_INTERVAL_MS.
// Deux utilisateurs différents peuvent envoyer en parallèle (jusqu'à `concurrency`).
const PER_USER_INTERVAL_MS = Number(process.env.EMAIL_PER_USER_INTERVAL_MS) || 30000

// Tente de réserver le créneau d'envoi de l'utilisateur (atomique via SET NX PX).
// Renvoie 0 si réservé (on peut envoyer), sinon le nombre de ms à attendre.
async function acquireUserSlot(userId: string): Promise<number> {
  const key = `email:throttle:${userId}`
  const ok = await redis.set(key, '1', 'PX', PER_USER_INTERVAL_MS, 'NX')
  if (ok === 'OK') return 0
  const ttl = await redis.pttl(key)
  return ttl > 0 ? ttl : PER_USER_INTERVAL_MS
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
})

const smtpFrom = process.env.SMTP_FROM || 'noreply@float.local'

interface SendEmailJobData {
  requestId: string
  isReminder?: boolean  // true when queued by the NO_RESPONSE scheduler
}

export const worker: Worker<SendEmailJobData> = new Worker<SendEmailJobData>(
  'emailQueue',
  async (job: Job<SendEmailJobData>, token?: string) => {
    const { requestId, isReminder = false } = job.data

    console.log(`[worker] Processing ${requestId} (reminder=${isReminder})`)

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
      throw new Error(`Request ${requestId} not found`)
    }

    const data = rows[0]

    // A manual relance is a SEPARATE request linked to an original (parentRequestId set).
    // An auto 30-day relance reuses the same request (no parent) and is flagged via the job.
    const isManualRelance = data.request.parentRequestId !== null
    const isAutoRelance = isReminder && !isManualRelance
    const useRelanceTemplate = isReminder || isManualRelance

    // Guard against double-processing: anything that should be PENDING (initial send or a
    // scheduled relance request) must still be PENDING. Auto relances are NO_RESPONSE.
    if (!isAutoRelance && data.request.status !== 'PENDING') {
      console.warn(`[worker] Skipping ${requestId} — expected PENDING, got ${data.request.status}`)
      return { requestId, skipped: true }
    }

    // Throttle PAR UTILISATEUR : si cet utilisateur a déjà envoyé récemment,
    // on replanifie ce job (sans consommer de tentative) au lieu de bloquer la file.
    // Les jobs d'autres utilisateurs continuent d'être traités en parallèle.
    const waitMs = await acquireUserSlot(data.user.id)
    if (waitMs > 0) {
      console.log(`[worker] User ${data.user.id} throttlé — report de ${requestId} de ${waitMs}ms`)
      await job.moveToDelayed(Date.now() + waitMs, token)
      throw new DelayedError()
    }

    const now = new Date()

    // For relances, use the relance/reminder template in the same language as the original.
    // The template name differs per language ('Relance' / 'Reminder'), so the keyword is
    // language-aware. Fall back to the original template if not found.
    let templateToUse = data.template
    if (useRelanceTemplate) {
      const keyword = data.template.language === 'en' ? '%reminder%' : '%relance%'
      const relanceRows = await db
        .select()
        .from(emailTemplates)
        .where(
          and(
            ilike(emailTemplates.name, keyword),
            eq(emailTemplates.language, data.template.language),
          )
        )
        .limit(1)

      if (relanceRows.length > 0) {
        templateToUse = relanceRows[0]
      } else {
        console.warn(`[worker] No reminder template found for language=${data.template.language}, falling back to original`)
      }
    }

    // The relance template cites the ORIGINAL send date. For a manual relance (separate
    // request), that date lives on the parent, not on this request.
    let originalSentAt = data.request.sentAt
    if (isManualRelance && data.request.parentRequestId) {
      const [parent] = await db
        .select({ sentAt: removalRequests.sentAt })
        .from(removalRequests)
        .where(eq(removalRequests.id, data.request.parentRequestId))
        .limit(1)
      originalSentAt = parent?.sentAt ?? data.request.sentAt
    }

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

    // firstName / lastName et l'adresse sont chiffrés en base → déchiffrer pour l'email.
    // (users.email n'est pas chiffré.) Adresse absente → '' : renderTemplate masque la ligne.
    const userAddress = addressRows[0]?.value ? safeDecrypt(addressRows[0].value) : ''

    const context = {
      user: {
        firstName: safeDecrypt(data.user.firstName),
        lastName: safeDecrypt(data.user.lastName),
        email: data.user.email,
      },
      userAddress,
      broker: {
        name: data.broker.name,
        emailContact: data.broker.emailContact,
      },
      request: {
        id: data.request.id,
        createdAt: data.request.createdAt,
        sentAt: originalSentAt,
        // {{request.date}} = today's date (initial send date, or relance date for reminders)
        referenceDate: now,
      },
      language: templateToUse.language,
    }

    const subject = renderTemplate(templateToUse.subject, context)
    const body = renderTemplate(templateToUse.body, context)

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: data.broker.emailContact,
      subject,
      text: body,
    })

    console.log(`[worker] sent ${info.messageId}`)

    if (isManualRelance) {
      // Scheduled relance (separate request): PENDING → SENT with its own send date.
      await db
        .update(removalRequests)
        .set({ status: 'SENT', sentAt: now, scheduledAt: null, updatedAt: now })
        .where(eq(removalRequests.id, requestId))

      await db.insert(requestEvents).values({
        requestId,
        eventType: 'reminder_sent',
        oldStatus: 'PENDING',
        newStatus: 'SENT',
        note: `Relance envoyée — messageId: ${info.messageId}`,
      })
    } else if (!isReminder) {
      // Initial send: PENDING → SENT
      await db
        .update(removalRequests)
        .set({ status: 'SENT', sentAt: now, scheduledAt: null, updatedAt: now })
        .where(eq(removalRequests.id, requestId))

      await db.insert(requestEvents).values({
        requestId,
        eventType: 'sent',
        oldStatus: 'PENDING',
        newStatus: 'SENT',
        note: `Email envoyé — messageId: ${info.messageId}`,
      })
    } else {
      // Auto 30-day relance: status is already NO_RESPONSE (set by the scheduler).
      // Keep it so the 60-day formal-notice logic can still fire. Just log the send.
      await db.insert(requestEvents).values({
        requestId,
        eventType: 'reminder_sent',
        note: `Relance automatique envoyée — messageId: ${info.messageId}`,
      })
    }

    return { requestId, messageId: info.messageId, isReminder }
  },
  {
    connection,
    // Plusieurs utilisateurs traités en parallèle. Le throttle par utilisateur
    // (acquireUserSlot) garantit ≤ 1 email / PER_USER_INTERVAL_MS et par utilisateur ;
    // `concurrency` borne le nombre d'utilisateurs envoyant simultanément.
    concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY) || 10,
  }
)

worker.on('failed', (job: Job<SendEmailJobData> | undefined, err: Error) => {
  console.error(`[worker] Job failed for request ${job?.data?.requestId}:`, err.message)
})

worker.on('completed', (job: Job<SendEmailJobData>) => {
  console.log(`[worker] Job completed for request ${job?.data?.requestId}`)
})
