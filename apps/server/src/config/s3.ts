import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createLogger } from '../middleware/logger.js';
import { config } from './env.js';

const logger = createLogger('s3');

export const s3Client = new S3Client({
  region: config.S3_REGION,
  endpoint: config.S3_ENDPOINT,
  forcePathStyle: !!config.S3_ENDPOINT, // Required for MinIO / LocalStack
  credentials:
    config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: config.S3_ACCESS_KEY_ID,
          secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function uploadJsonToS3(key: string, data: any): Promise<string> {
  try {
    const body = JSON.stringify(data);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      }),
    );
    return key;
  } catch (err) {
    logger.error({ err, key }, 'Failed to upload JSON to S3');
    throw err;
  }
}

export async function getJsonFromS3<T = any>(key: string): Promise<T | null> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      }),
    );
    const str = await response.Body?.transformToString();
    if (!str) return null;
    return JSON.parse(str) as T;
  } catch (err: any) {
    if (err.name === 'NoSuchKey') return null;
    logger.error({ err, key }, 'Failed to fetch JSON from S3');
    throw err;
  }
}
