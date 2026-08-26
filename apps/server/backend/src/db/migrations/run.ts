import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../config/db.js';
import { createLogger } from '../../middleware/logger.js';

const logger = createLogger('migrator');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  logger.info({ schemaPath }, 'Reading schema file');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    logger.info('Executing database schema DDL...');
    await client.query(sql);
    logger.info('Database schema DDL executed successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to execute schema DDL');
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      logger.info('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Migration failed');
      process.exit(1);
    });
}
