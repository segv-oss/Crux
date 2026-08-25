import { Redis } from 'ioredis';
import { config } from './env.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('redis');

// Dedicated Redis instances to prevent Pub/Sub state blocking standard commands
export const redisClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null; // Stop infinite reconnect loop
    return Math.min(times * 50, 500);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

export const redisPubClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 50, 500);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

export const redisSubClient = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 50, 500);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

redisClient.on('error', (err) => logger.error({ err }, 'redisClient error'));
redisPubClient.on('error', (err) => logger.error({ err }, 'redisPubClient error'));
redisSubClient.on('error', (err) => logger.error({ err }, 'redisSubClient error'));

export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([
      redisClient.connect(),
      redisPubClient.connect(),
      redisSubClient.connect(),
    ]);
    logger.info('Connected all 3 dedicated Redis instances');
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed, continuing in-memory or degraded mode if allowed');
  }
}
