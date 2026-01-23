import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { createApiKey, listApiKeys } from '@/lib/auth/api-key';
import { createAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

/**
 * GET /api/api-keys
 * List all active API keys for the current club.
 * Requires manage-api-keys permission.
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission
    if (!context.ability.can('manage-api-keys', 'ApiKey')) {
      return forbiddenResponse('You do not have permission to manage API keys');
    }

    const keys = await listApiKeys(context.clubId);

    return NextResponse.json({ keys });
  } catch (error) {
    return serverErrorResponse(error, 'api-keys:GET');
  }
}

/**
 * POST /api/api-keys
 * Create a new API key for the current club.
 * Returns the raw key ONLY ONCE - store it securely!
 * Requires manage-api-keys permission.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission
    if (!context.ability.can('manage-api-keys', 'ApiKey')) {
      return forbiddenResponse('You do not have permission to create API keys');
    }

    const body = await request.json();
    const validationResult = createApiKeySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, expiresInDays } = validationResult.data;

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create the API key
    const { id, key, keyPrefix, expiresAt: expiration } = await createApiKey(
      context.clubId,
      name,
      context.userId,
      expiresAt
    );

    // Audit the creation
    const audit = createAuditLogger(request, {
      clubId: context.clubId,
      userId: context.userId,
    });

    await audit.log({
      action: 'API_KEY_CREATED',
      targetType: 'ApiKey',
      targetId: id,
      metadata: { name, expiresAt: expiration },
    });

    return NextResponse.json(
      {
        id,
        key,  // ONLY TIME the raw key is returned!
        keyPrefix,
        name,
        expiresAt: expiration,
        message: 'Store this key securely - it will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'api-keys:POST');
  }
}
