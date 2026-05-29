import { Queue } from 'bullmq';

const redisUrl = new URL(process.env.REDIS_URL || 'redis://redis:6379');
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
};

export const emailQueue = new Queue('emailQueue', { connection });

console.log("Service BullMQ (emailQueue) initialisé.");