import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const isS3Configured = Boolean(
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
);

const s3Client = isS3Configured
  ? new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined, // For Cloudflare R2 / Supabase Storage / MinIO
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

const BUCKET_NAME = process.env.S3_BUCKET || 'atharva-travels-private-storage';

/**
 * Upload a file to durable private object storage (S3/R2) or fallback local storage.
 */
export async function uploadDurableFile(
  key: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<{ key: string; location: string }> {
  const sanitizedKey = key.replace(/^\/+/, '');

  if (s3Client) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: sanitizedKey,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256', // Encryption at rest
    });
    await s3Client.send(command);
    return {
      key: sanitizedKey,
      location: `s3://${BUCKET_NAME}/${sanitizedKey}`,
    };
  } else {
    // Durable local storage fallback for local development
    const storageDir = path.join(process.cwd(), 'storage');
    const targetFile = path.join(storageDir, sanitizedKey);
    const targetDir = path.dirname(targetFile);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetFile, buffer);
    return {
      key: sanitizedKey,
      location: `local://${sanitizedKey}`,
    };
  }
}

/**
 * Retrieve a file from durable storage
 */
export async function getDurableFile(key: string): Promise<Buffer | null> {
  const sanitizedKey = key.replace(/^\/+/, '');

  if (s3Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: sanitizedKey,
      });
      const response = await s3Client.send(command);
      const byteArray = await response.Body?.transformToByteArray();
      return byteArray ? Buffer.from(byteArray) : null;
    } catch (e) {
      console.error(`S3 getObject failed for ${sanitizedKey}:`, e);
      return null;
    }
  } else {
    const targetFile = path.join(process.cwd(), 'storage', sanitizedKey);
    if (!fs.existsSync(targetFile)) return null;
    return fs.readFileSync(targetFile);
  }
}

/**
 * Generate a secure time-limited presigned URL for authorized download
 */
export async function getDurableDownloadUrl(key: string, expiresInSeconds: number = 300): Promise<string> {
  const sanitizedKey = key.replace(/^\/+/, '');

  if (s3Client) {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: sanitizedKey,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } else {
    // Local development endpoint
    return `/api/storage/download?key=${encodeURIComponent(sanitizedKey)}`;
  }
}

