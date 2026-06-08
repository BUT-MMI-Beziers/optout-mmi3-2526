import { Worker, Job } from 'bullmq'
import nodemailer from 'nodemailer'
import { eq, and } from 'drizzle-orm'
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

// ============================================================
// CONNEXION REDIS (mÃªme config que queue.service.ts cÃ´tÃ© API)
// ============================================================



const redisUrl = new URL(process.env.REDIS_URL || 'redis://redis:6379')
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
}

// ============================================================
// TRANSPORTEUR SMTP
// En dev : Mailpit capture tout (rien ne part vraiment)
// ============================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
})

const smtpFrom = process.env.SMTP_FROM || 'noreply@float.local'

// ============================================================
// FEATURE 7 : WORKER emailQueue
// Consomme les jobs ajoutÃ©s par POST /api/v1/requests/:id/send
// (cf. requests.routes.ts) et :
//  1. Charge la demande complÃ¨te (user + broker + template + adresse)
//  2. Interpole le template via le service template.service.ts
//  3. Envoie l'email via SMTP (Mailpit en dev)
//  4. Logge un request_event de type 'sent' (audit RGPD)
//
// Note : le statut DRAFT -> SENT est dÃ©jÃ  fait par la route Fabien.
// Le worker ne s'occupe que de l'envoi + de l'audit.
//
// Rate limit : 1 job toutes les 2 secondes (CDC Â§4.4.4)
// ============================================================

type SendEmailJobData = {
  requestId: string
}
const worker = new Worker(
  'emailQueue',
  async (job: Job) => {
    const { requestId } = job.data

    console.log(`[worker] Processing ${requestId}`)

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

    const userAddress =
      addressRows[0]?.value ?? '[Adresse non renseignée]'

    const context = {
      user: {
        firstName: data.user.firstName,
        lastName: data.user.lastName,
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
      },
    }

    const subject = renderTemplate(data.template.subject, context)
    const body = renderTemplate(data.template.body, context)

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: data.broker.emailContact,
      subject,
      text: body,
    })

    console.log(`[worker] sent ${info.messageId}`)

    await db.insert(requestEvents).values({
      requestId,
      eventType: 'sent',
      oldStatus: 'DRAFT',
      newStatus: 'SENT',
      note: `Email sent`,
    })

    return { requestId, messageId: info.messageId }
  },
  {
    connection,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 2000, // OK rate limit
    },
  }
)