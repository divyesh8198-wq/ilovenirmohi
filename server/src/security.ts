import path from 'path';
import { timingSafeEqual } from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in server/.env');
  }
  return secret;
}

export function matchesSecret(provided: unknown, expected: string | undefined): boolean {
  if (typeof provided !== 'string' || !expected || expected.length < 32) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
