import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'scrapbook-media';

export async function initializeMediaStorage(): Promise<void> {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
  });
  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw createError;
  }
}

export async function uploadMedia(
  category: 'photos' | 'videos' | 'voice-notes' | 'selfies',
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const objectPath = `${category}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return objectPath;
}

export async function downloadMedia(objectPath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteMedia(objectPath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) throw error;
}
