import pg from 'pg';
import { config } from './env.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('db');

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected idle client error on PostgreSQL pool');
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT 1 AS connected');
    return res.rows[0]?.connected === 1;
  } catch (err) {
    logger.warn({ err }, 'PostgreSQL connection check failed');
    return false;
  }
}
