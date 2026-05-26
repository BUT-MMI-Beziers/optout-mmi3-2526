import { Queue, Worker } from 'bullmq'

const connection = {
  host: 'redis',
  port: 6379
}

export const emailQueue = new Queue('emails', { connection })

export const emailWorker = new Worker('emails', async (job) => {
  console.log(`Processing job ${job.id}:`, job.data)
}, { connection })

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} terminé`)
})

emailWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} échoué : ${err.message}`)
})