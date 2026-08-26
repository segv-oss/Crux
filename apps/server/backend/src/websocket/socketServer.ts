import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisPubClient, redisSubClient, isRedisReady } from '../config/redis.js';
import { config } from '../config/env.js';
import { pool } from '../config/db.js';
import { reconcileClientState } from './stateSync.js';
import { JwtPayload } from '../middleware/auth.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('socket-server');

export let io: Server;

export function initializeWebSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Attach Redis adapter only if Redis cluster is fully ready & connected
  if (isRedisReady()) {
    try {
      io.adapter(createAdapter(redisPubClient, redisSubClient));
      logger.info('Attached Redis Adapter to Socket.IO server');
    } catch (err) {
      logger.warn({ err }, 'Redis adapter attachment failed, falling back to in-memory socket server');
    }
  } else {
    logger.info('Running Socket.IO server in standalone in-memory mode (Redis offline/degraded)');
  }

  // Handshake authentication middleware with pinned algorithm
  io.use(async (socket: Socket, next) => {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!authHeader) {
      return next(new Error('AUTHENTICATION_REQUIRED: Missing auth token'));
    }

    const token = authHeader.replace(/^Bearer\s+/, '');
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;
      (socket as any).user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };
      next();
    } catch {
      next(new Error('INVALID_TOKEN: Token verification failed'));
    }
  });

  // Handle incoming connections
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info({ socketId: socket.id, userId: user?.id }, 'WebSocket client connected');

    // Tenant-asserted pr:join handler
    socket.on('pr:join', async (data: { prId: string; repoId: string; lastSequenceNumber?: number }) => {
      const { prId, repoId, lastSequenceNumber } = data;

      if (!prId || !repoId) {
        socket.emit('error', { code: 'INVALID_PARAMETERS', message: 'prId and repoId are required to join room' });
        return;
      }

      try {
        // Assert active tenancy membership
        const memberRes = await pool.query(
          `SELECT 1
           FROM org_members om
           JOIN repositories r ON r.org_id = om.org_id
           JOIN pull_requests pr ON pr.repo_id = r.id
           WHERE om.user_id = $1
             AND r.id = $2
             AND pr.id = $3
             AND om.deleted_at IS NULL
             AND r.deleted_at IS NULL
             AND pr.deleted_at IS NULL`,
          [user.id, repoId, prId]
        );

        if (memberRes.rowCount === 0) {
          socket.emit('error', {
            code: 'FORBIDDEN_TENANT_ACCESS',
            message: 'User does not have access to this repository or pull request.',
          });
          return;
        }

        const room = `pr:${prId}`;
        await socket.join(room);
        logger.info({ socketId: socket.id, userId: user.id, room }, 'Client joined PR room');

        socket.emit('pr:joined', { prId, room, joinedAt: new Date().toISOString() });

        // State reconciliation if lastSequenceNumber provided
        if (typeof lastSequenceNumber === 'number') {
          await reconcileClientState(socket, prId, lastSequenceNumber);
        }
      } catch (err: unknown) {
        logger.error({ err, userId: user.id, prId }, 'Error processing pr:join');
        socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join PR room' });
      }
    });

    socket.on('pr:leave', (data: { prId: string }) => {
      if (data.prId) {
        socket.leave(`pr:${data.prId}`);
        logger.info({ socketId: socket.id, prId: data.prId }, 'Client left PR room');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'WebSocket client disconnected');
    });
  });

  // Subscribe to Redis Pub/Sub crux:events if Redis is active
  if (isRedisReady()) {
    try {
      redisSubClient.subscribe('crux:events', (err) => {
        if (err) logger.warn({ err }, 'Failed to subscribe to crux:events Pub/Sub channel');
      });

      redisSubClient.on('message', (channel, message) => {
        if (channel === 'crux:events') {
          try {
            const event = JSON.parse(message);
            if (event.prId && io) {
              io.to(`pr:${event.prId}`).emit(event.eventType, event);
            }
            if (event.repoId && io) {
              io.to(`repo:${event.repoId}`).emit(event.eventType, event);
            }
          } catch (parseErr) {
            logger.error({ parseErr }, 'Failed to parse incoming crux:events message');
          }
        }
      });
    } catch (err) {
      logger.warn({ err }, 'Error setting up Redis Pub/Sub listener on socket server');
    }
  }

  return io;
}
