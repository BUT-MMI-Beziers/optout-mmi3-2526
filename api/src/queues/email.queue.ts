import { Queue, type ConnectionOptions } from 'bullmq'

// ============================================================
// CONNEXION REDIS
// On passe la config à BullMQ qui crée la connexion en interne.
// Évite les conflits de versions ioredis entre la lib racine
// et celle embarquée par BullMQ.
// ============================================================

export const redisConnection: ConnectionOptions = {
  url: process.env.REDIS_URL || 'redis://redis:6379',
  maxRetriesPerRequest: null,
}

// ============================================================
// QUEUE : email-queue
// File d'attente des emails à envoyer (demandes RGPD).
// Les jobs y déposent un { requestId } et le worker consomme.
// ============================================================

export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

// ============================================================
// HELPER : ajouter un job d'envoi d'email à la queue
// Utilisé plus tard par POST /api/v1/requests/:id/send
// ============================================================

export type SendEmailJobData = {
  requestId: string
}

export async function enqueueSendEmail(requestId: string) {
  return emailQueue.add('send-email', { requestId })
}