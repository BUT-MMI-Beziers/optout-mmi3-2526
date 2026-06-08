import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { removalRequests, users, brokers, emailTemplates, userContacts, requestEvents, } from '../db/schema.js';
import { renderTemplate } from '../services/template.service.js';
// ============================================================
// CONNEXION REDIS (mÃªme config que queue.service.ts cÃ´tÃ© API)
// ============================================================
const redisUrl = new URL(process.env.REDIS_URL || 'redis://redis:6379');
const connection = {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port) || 6379,
};
// ============================================================
// TRANSPORTEUR SMTP
// En dev : Mailpit capture tout (rien ne part vraiment)
// ============================================================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mailpit',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: false,
});
const smtpFrom = process.env.SMTP_FROM || 'noreply@float.local';
const worker = new Worker('emailQueue', async (job) => {
    const { requestId } = job.data;
    console.log(`[worker] Job ${job.id} - traitement de la demande ${requestId}`);
    // 1. RÃ©cupÃ©rer la demande + user + broker + template
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
        .limit(1);
    if (rows.length === 0) {
        throw new Error(`Request ${requestId} introuvable en base`);
    }
    const data = rows[0];
    // 2. RÃ©cupÃ©rer l'adresse principale
    const addressRows = await db
        .select()
        .from(userContacts)
        .where(and(eq(userContacts.userId, data.user.id), eq(userContacts.type, 'address'), eq(userContacts.isPrimary, true)))
        .limit(1);
    const userAddress = addressRows.length > 0
        ? addressRows[0].value
        : '[Adresse non renseignÃ©e]';
    // 3. Construire le contexte attendu par renderTemplate()
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
    };
    // 4. Interpoler subject + body via le service partagÃ©
    const subject = renderTemplate(data.template.subject, context);
    const body = renderTemplate(data.template.body, context);
    // 5. Envoi SMTP
    const info = await transporter.sendMail({
        from: smtpFrom,
        to: data.broker.emailContact,
        subject,
        text: body,
    });
    console.log(`[worker] Email envoyÃ© Ã  ${data.broker.emailContact} (messageId: ${info.messageId})`);
    // 6. Log d'Ã©vÃ©nement pour la traÃ§abilitÃ© (audit RGPD)
    await db.insert(requestEvents).values({
        requestId,
        eventType: 'sent',
        oldStatus: 'DRAFT',
        newStatus: 'SENT',
        note: `Email envoyÃ© Ã  ${data.broker.emailContact}`,
    });
    return { requestId, messageId: info.messageId };
}, {
    connection,
    concurrency: 1,
    limiter: {
        max: 1,
        duration: 2000, // 1 envoi max toutes les 2000ms (CDC Â§4.4.4)
    },
});
worker.on('completed', (job, result) => {
    console.log(`[worker] âœ… Job ${job.id} terminÃ© (request ${result?.requestId})`);
});
worker.on('failed', (job, err) => {
    console.error(`[worker] âŒ Job ${job?.id} Ã©chouÃ© :`, err.message);
});
worker.on('error', (err) => {
    console.error('[worker] Erreur worker :', err);
});
console.log('[worker] Worker emailQueue dÃ©marrÃ©, en attente de jobs...');
