import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { revokeGrant } from '@/lib/auth/permission-grant';
import { createAuditLogger } from '@/lib/audit/logger';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/permission-grants/[id]
 * Revoke a permission grant
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: grantId } = await params;
    const { user, clubId, roles, error } = await getClaimsForApiRoute();

    if (error || !user || !clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only FACILITY_ADMIN and CLUB_ADMIN can revoke grants
    const isAdmin = roles.includes('FACILITY_ADMIN') || roles.includes('CLUB_ADMIN');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify grant exists and belongs to current club
    const existing = await prisma.permissionGrant.findUnique({
      where: { id: grantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    if (existing.clubId !== clubId) {
      return NextResponse.json(
        { error: 'Cannot revoke grant from different club' },
        { status: 403 }
      );
    }

    if (existing.revokedAt) {
      return NextResponse.json(
        { error: 'Grant already revoked' },
        { status: 400 }
      );
    }

    const grant = await revokeGrant(grantId);

    // Audit log
    const logger = createAuditLogger(request, { userId: user.id, clubId });
    await logger.log({
      action: 'PERMISSION_GRANT_REVOKED',
      targetType: 'PermissionGrant',
      targetId: grant.id,
      metadata: {
        revokedUserId: grant.userId,
        roles: grant.roles,
        originalExpiration: grant.expiresAt.toISOString(),
        revokedBy: user.id,
      },
    });

    // TODO: Send notification to user about revoked grant
    // This will be added in the notification plan

    return NextResponse.json({ grant });
  } catch (error) {
    console.error('Failed to revoke grant:', error);
    return NextResponse.json(
      { error: 'Failed to revoke grant' },
      { status: 500 }
    );
  }
}
