import path from 'path';
import dotenv from 'dotenv';
import { AwsClient } from 'aws4fetch';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/$/, '');
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-2';
const bucket = process.env.NEON_STORAGE_BUCKET || 'scrapbook-media';

if (!endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error('AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are required for media storage');
}

const client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region });

function objectUrl(objectPath = ''): string {
  const safePath = objectPath.split('/').map(encodeURIComponent).join('/');
  return `${endpoint}/${encodeURIComponent(bucket)}${safePath ? `/${safePath}` : ''}`;
}

async function request(method: string, objectPath = '', body?: Buffer, contentType?: string): Promise<Response> {
  return client.fetch(objectUrl(objectPath), {
    method,
    ...(body ? { body } : {}),
    ...(contentType ? { headers: { 'content-type': contentType } } : {}),
  });
}

export async function initializeMediaStorage(): Promise<void> {
  const response = await request('HEAD');
  if (!response.ok) {
    throw new Error(`Neon Object Storage bucket check failed (${response.status}); verify the bucket and AWS credentials`);
  }
}

export async function uploadMedia(
  category: 'photos' | 'videos' | 'voice-notes' | 'selfies',
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const objectPath = `${category}/${filename}`;
  const response = await request('PUT', objectPath, buffer, contentType);
  if (!response.ok) throw new Error(`Neon Object Storage upload failed (${response.status})`);
  return objectPath;
}

export async function downloadMedia(objectPath: string): Promise<Buffer> {
  const response = await request('GET', objectPath);
  if (!response.ok) throw new Error(`Neon Object Storage download failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteMedia(objectPath: string): Promise<void> {
  const response = await request('DELETE', objectPath);
  if (!response.ok) throw new Error(`Neon Object Storage delete failed (${response.status})`);
}
