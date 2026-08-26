import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { pool } from './config/db.js';
import { config } from './config/env.js';
import { connectRedis, redisClient, redisPubClient, redisSubClient } from './config/redis.js';
import { createLogger } from './middleware/logger.js';
import { startCleanupWorker } from './queue/cleanupWorker.js';
import { startOutboxRelay } from './queue/outboxRelay.js';
import { startWebhookDrainer } from './queue/webhookDrainer.js';
import { initializeWebSocketServer } from './websocket/socketServer.js';

const logger = createLogger('server');

export async function bootstrap() {
  logger.info(
    { env: config.NODE_ENV, port: config.PORT },
    'Initializing Crux Backend Service (Hono)...',
  );

  // 1. Initialize Redis connections
  await connectRedis();

  // 2. Initialize Hono App
  const app = createApp();

  // 3. Start Node.js HTTP server via @hono/node-server
  const server = serve(
    {
      fetch: app.fetch,
      port: config.PORT,
    },
    (info) => {
      logger.info({ port: info.port }, `Crux API Server (Hono) running on port ${info.port}`);
    },
  );

  // 4. Initialize Socket.IO with Redis adapter attached to Node HTTP server
  const io = initializeWebSocketServer(server as any);

  // 5. Start Background Workers
  const stopOutboxRelay = startOutboxRelay(1000);
  const stopWebhookDrainer = startWebhookDrainer(5000);
  const stopCleanupWorker = startCleanupWorker(600000); // every 10 min

  // 6. Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated...');

    // Stop background workers
    stopOutboxRelay();
    stopWebhookDrainer();
    stopCleanupWorker();

    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await Promise.all([
          pool.end().catch(() => {}),
          redisClient.quit().catch(() => {}),
          redisPubClient.quit().catch(() => {}),
          redisSubClient.quit().catch(() => {}),
        ]);
        logger.info('Database and Redis connections closed cleanly.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during connection teardown');
        process.exit(1);
      }
    });

    // Force close after 10s if hanging
    const forceExitTimer = setTimeout(() => {
      logger.error('Shutdown timed out, force exiting.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, server, io };
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.fatal({ err }, 'Fatal error during server startup');
    process.exit(1);
  });
}
