import { ensureDevAuth, getApiMode } from './api';
import type { FeedEvent, MessageT, ReviewT, TaskT } from './fixtures';
import { randomId } from './utils';

type Handler = (ev: FeedEvent) => void;
type StatusHandler = (connected: boolean) => void;

const SCRIPT: Array<{ afterMs: number; make: (at: string) => FeedEvent }> = [
  {
    afterMs: 3500,
    make: (at) => ({
      id: randomId('ev'),
      kind: 'checks',
      at,
      checks: 'passing',
    }),
  },
  {
    afterMs: 6000,
    make: (at) => ({
      id: randomId('ev'),
      kind: 'message',
      at,
      message: {
        id: randomId('msg'),
        prId: 'pr_482',
        userId: 'usr_arun',
        slackMessageId: null,
        text: 'pushed the redis fallback test — bucket falls back to static defaults when redis throws',
        version: 1,
        sentAt: at,
        updatedAt: at,
      },
    }),
  },
  {
    afterMs: 8000,
    make: (at) => ({
      id: randomId('ev'),
      kind: 'task',
      at,
      task: {
        id: 'task_2',
        prId: 'pr_482',
        assigneeId: 'usr_arun',
        linearTaskId: 'CRX-219',
        title: 'Add backoff to refresh flow',
        done: true,
        priority: 'p1',
        version: 2,
        linearUrl: 'https://linear.app/segv/issue/CRX-219',
        createdAt: at,
        updatedAt: at,
      },
    }),
  },
  {
    afterMs: 7000,
    make: (at) => ({
      id: randomId('ev'),
      kind: 'review',
      at,
      review: {
        id: randomId('rev'),
        prId: 'pr_482',
        reviewerId: 'usr_jm',
        action: 'approved',
        comment: 'Fallback path verified. Approving.',
        isDismissed: false,
        version: 1,
        createdAt: at,
        updatedAt: at,
      },
    }),
  },
  {
    afterMs: 6000,
    make: (at) => ({
      id: randomId('ev'),
      kind: 'review',
      at,
      review: {
        id: randomId('rev'),
        prId: 'pr_482',
        reviewerId: 'usr_arun',
        action: 'approved',
        comment: 'My fallback concern is addressed by the new test. Approving.',
        isDismissed: false,
        version: 2,
        createdAt: at,
        updatedAt: at,
      },
    }),
  },
];

const AMBIENT: Array<() => FeedEvent> = [
  () => ({
    id: randomId('ev'),
    kind: 'message',
    at: new Date().toISOString(),
    message: {
      id: randomId('msg'),
      prId: 'pr_482',
      userId: 'usr_jm',
      slackMessageId: null,
      text: 'staging deploy picked up the branch — watching error rates',
      version: 1,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  () => ({
    id: randomId('ev'),
    kind: 'message',
    at: new Date().toISOString(),
    message: {
      id: randomId('msg'),
      prId: 'pr_482',
      userId: 'usr_arun',
      slackMessageId: null,
      text: 'tier config looks right for enterprise burst traffic',
      version: 1,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
];

export function subscribeLive(
  repoId: string,
  prId: string,
  handler: Handler,
  onStatusChange?: StatusHandler,
): () => void {
  const currentMode = getApiMode();

  if (currentMode === 'live') {
    let socketInstance: any = null;
    let isDisposed = false;

    void (async () => {
      const token = await ensureDevAuth();
      if (isDisposed) return;

      try {
        const { io } = await import('socket.io-client');
        const socket = io('/', {
          auth: { token: `Bearer ${token}` },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        socketInstance = socket;

        socket.on('connect', () => {
          if (isDisposed) return;
          onStatusChange?.(true);
          socket.emit('pr:join', {
            prId,
            repoId: repoId || 'repo_crux_core',
            lastSequenceNumber: 0,
          });
        });

        socket.on('disconnect', () => {
          if (!isDisposed) onStatusChange?.(false);
        });

        socket.on('connect_error', () => {
          if (!isDisposed) onStatusChange?.(false);
        });

        socket.on('pr:joined', () => {
          if (!isDisposed) onStatusChange?.(true);
        });

        socket.on(
          'pr:sync',
          (sync: {
            events: Array<{ type: string; payload: unknown; sequenceNumber?: number }>;
          }) => {
            for (const ev of sync.events ?? []) {
              const at = new Date().toISOString();
              if (ev.type === 'message:new') {
                handler({
                  id: randomId('ev'),
                  kind: 'message',
                  at,
                  message: ev.payload as MessageT,
                });
              } else if (ev.type === 'task:created' || ev.type === 'task:updated') {
                handler({ id: randomId('ev'), kind: 'task', at, task: ev.payload as TaskT });
              } else if (ev.type === 'pr:review') {
                handler({ id: randomId('ev'), kind: 'review', at, review: ev.payload as ReviewT });
              } else if (ev.type === 'checks:updated') {
                handler({
                  id: randomId('ev'),
                  kind: 'checks',
                  at,
                  checks: (ev.payload as any)?.checks || 'passing',
                });
              }
            }
          },
        );

        socket.on('message:new', (data: any) => {
          const at = new Date().toISOString();
          const msg = data.payload || data;
          handler({ id: randomId('ev'), kind: 'message', at, message: msg });
        });

        socket.on('task:updated', (data: any) => {
          const at = new Date().toISOString();
          const task = data.payload || data;
          handler({ id: randomId('ev'), kind: 'task', at, task });
        });

        socket.on('task:created', (data: any) => {
          const at = new Date().toISOString();
          const task = data.payload || data;
          handler({ id: randomId('ev'), kind: 'task', at, task });
        });

        socket.on('pr:review', (data: any) => {
          const at = new Date().toISOString();
          const review = data.payload || data;
          handler({ id: randomId('ev'), kind: 'review', at, review });
        });

        socket.on('pr:merged', () => {
          const at = new Date().toISOString();
          handler({ id: randomId('ev'), kind: 'checks', at, checks: 'merged' });
        });
      } catch (err) {
        console.warn('Socket.IO connection failed:', err);
        onStatusChange?.(false);
      }
    })();

    return () => {
      isDisposed = true;
      if (socketInstance) {
        try {
          socketInstance.emit('pr:leave', { prId });
          socketInstance.disconnect();
        } catch {}
      }
      onStatusChange?.(false);
    };
  }

  // Mock mode streaming simulation
  onStatusChange?.(true);
  const timers: ReturnType<typeof setTimeout>[] = [];
  let elapsed = 0;

  for (const step of SCRIPT) {
    elapsed += step.afterMs;
    timers.push(setTimeout(() => handler(step.make(new Date().toISOString())), elapsed));
  }

  let ambient: ReturnType<typeof setInterval> | null = null;
  const ambientTimer = setTimeout(() => {
    ambient = setInterval(() => {
      handler(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]());
    }, 14000);
  }, 30000);

  return () => {
    timers.forEach(clearTimeout);
    clearTimeout(ambientTimer);
    if (ambient) clearInterval(ambient);
    onStatusChange?.(false);
  };
}
