/**
 * AES-256-CBC encryption for Regatta Central OAuth tokens.
 * Tokens are stored encrypted in database to protect user credentials.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.RC_TOKEN_ENCRYPTION_KEY;

/**
 * Encrypt a token using AES-256-CBC.
 * Returns format: iv:encryptedData (hex encoded)
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('RC_TOKEN_ENCRYPTION_KEY not configured');
  }

  const iv = randomBytes(16);
  const cipher = createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a token encrypted with encryptToken.
 * Input format: iv:encryptedData (hex encoded)
 */
export function decryptToken(encrypted: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('RC_TOKEN_ENCRYPTION_KEY not configured');
  }

  const [ivHex, encryptedHex] = encrypted.split(':');

  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted token format');
  }

  const decipher = createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
