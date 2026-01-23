import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';

const KEY_PREFIX = 'sk_';      // Secret key prefix (Stripe pattern)
const KEY_LENGTH = 32;          // Random part length
const PREFIX_DISPLAY_LENGTH = 8; // Chars to show for identification

/**
 * Result of API key creation.
 * key is only returned once - store it securely!
 */
export interface CreateApiKeyResult {
  id: string;
  key: string;        // Full key - only returned at creation
  keyPrefix: string;  // For display/identification
  expiresAt: Date | null;
}

/**
 * Creates a new API key for a club.
 *
 * The raw key is returned ONLY at creation time.
 * Store it securely - we only keep the hash.
 *
 * @param clubId - Club the key belongs to
 * @param name - User-friendly name for the key
 * @param createdBy - userId who is creating the key
 * @param expiresAt - Optional expiration date
 */
export async function createApiKey(
  clubId: string,
  name: string,
  createdBy: string,
  expiresAt?: Date
): Promise<CreateApiKeyResult> {
  // Generate secure random key
  const randomPart = nanoid(KEY_LENGTH);
  const fullKey = `${KEY_PREFIX}${randomPart}`;
  const keyPrefix = fullKey.substring(0, PREFIX_DISPLAY_LENGTH);

  // Hash for storage (never store raw key)
  const keyHash = createHash('sha256')
    .update(fullKey)
    .digest('hex');

  const apiKey = await prisma.apiKey.create({
    data: {
      clubId,
      name,
      keyPrefix,
      keyHash,
      createdBy,
      permissions: {}, // Full access per CONTEXT.md decision
      expiresAt: expiresAt ?? null,
    },
  });

  return {
    id: apiKey.id,
    key: fullKey, // Only returned once!
    keyPrefix,
    expiresAt: apiKey.expiresAt,
  };
}

/**
 * Result of API key validation.
 */
export interface ValidateApiKeyResult {
  valid: boolean;
  clubId?: string;
  userId?: string;  // Creator's userId for permission inheritance
}

/**
 * Validates an API key.
 *
 * Checks:
 * 1. Key has correct prefix
 * 2. Hash exists in database
 * 3. Key is not revoked
 * 4. Key is not expired
 *
 * Updates lastUsedAt timestamp on successful validation.
 *
 * @param key - Full API key to validate
 */
export async function validateApiKey(key: string): Promise<ValidateApiKeyResult> {
  // Check prefix
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  // Hash the provided key
  const keyHash = createHash('sha256')
    .update(key)
    .digest('hex');

  // Look up by hash
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      clubId: true,
      createdBy: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!apiKey) {
    return { valid: false };
  }

  // Check if revoked
  if (apiKey.revokedAt) {
    return { valid: false };
  }

  // Check if expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false };
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Non-blocking - don't fail validation if update fails
    });

  return {
    valid: true,
    clubId: apiKey.clubId,
    userId: apiKey.createdBy,
  };
}

/**
 * Revokes an API key (soft delete).
 *
 * @param keyId - ID of the key to revoke
 * @param revokedBy - userId performing the revocation (for audit)
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Lists API keys for a club (for admin view).
 * Does NOT return key hashes.
 */
export async function listApiKeys(clubId: string) {
  return prisma.apiKey.findMany({
    where: {
      clubId,
      revokedAt: null, // Only active keys
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdBy: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
