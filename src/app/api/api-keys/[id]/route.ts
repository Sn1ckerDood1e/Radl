import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { revokeApiKey } from '@/lib/auth/api-key';
import { createAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/api-keys/[id]
 * Revoke an API key (soft delete).
 * Requires manage-api-keys permission.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission
    if (!context.ability.can('manage-api-keys', 'ApiKey')) {
      return forbiddenResponse('You do not have permission to revoke API keys');
    }

    // Verify the key belongs to this club
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        clubId: context.clubId,
        revokedAt: null,  // Only active keys can be revoked
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    // Revoke the key
    await revokeApiKey(id);

    // Audit the revocation
    const audit = createAuditLogger(request, {
      clubId: context.clubId,
      userId: context.userId,
    });

    await audit.log({
      action: 'API_KEY_REVOKED',
      targetType: 'ApiKey',
      targetId: id,
      metadata: {
        keyName: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        createdBy: apiKey.createdBy,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'api-keys:DELETE');
  }
}

/**
 * GET /api/api-keys/[id]
 * Get details of a specific API key.
 * Requires manage-api-keys permission.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check permission
    if (!context.ability.can('manage-api-keys', 'ApiKey')) {
      return forbiddenResponse('You do not have permission to view API keys');
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        clubId: context.clubId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdBy: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    return serverErrorResponse(error, 'api-keys:GET');
  }
}
