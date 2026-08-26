import pino from 'pino';

export const logger = pino({
  name: 'crux-api',
  level: process.env.LOG_LEVEL || 'info',
});

export function createLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
