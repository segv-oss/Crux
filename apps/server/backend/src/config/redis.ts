import { Redis } from 'ioredis';
import { config } from './env.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('redis');

let redisConnected = false;

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

redisClient.on('error', (err) => {
  redisConnected = false;
  logger.error({ err }, 'redisClient error');
});
redisPubClient.on('error', (err) => {
  redisConnected = false;
  logger.error({ err }, 'redisPubClient error');
});
redisSubClient.on('error', (err) => {
  redisConnected = false;
  logger.error({ err }, 'redisSubClient error');
});

redisClient.on('ready', () => {
  redisConnected = true;
  logger.info('redisClient connected and ready');
});

export function isRedisReady(): boolean {
  return redisConnected && redisClient.status === 'ready' && redisPubClient.status === 'ready' && redisSubClient.status === 'ready';
}

export async function connectRedis(): Promise<boolean> {
  try {
    await Promise.all([
      redisClient.connect(),
      redisPubClient.connect(),
      redisSubClient.connect(),
    ]);
    redisConnected = true;
    logger.info('Connected all 3 dedicated Redis instances');
    return true;
  } catch (err) {
    redisConnected = false;
    logger.warn({ err }, 'Redis connection failed, continuing in single-node/in-memory mode');
    return false;
  }
}
