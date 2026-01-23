import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { createGrant, getClubGrants } from '@/lib/auth/permission-grant';
import { createGrantSchema } from '@/lib/validations/permission-grant';
import { createAuditLogger } from '@/lib/audit/logger';
import type { Role } from '@/generated/prisma';

/**
 * GET /api/permission-grants
 * List active permission grants in current club
 */
export async function GET(request: NextRequest) {
  try {
    const { user, clubId, roles, error } = await getClaimsForApiRoute();

    if (error || !user || !clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only FACILITY_ADMIN and CLUB_ADMIN can view grants
    const isAdmin = roles.includes('FACILITY_ADMIN') || roles.includes('CLUB_ADMIN');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const includeExpired = request.nextUrl.searchParams.get('includeExpired') === 'true';
    const grants = await getClubGrants(clubId, includeExpired);

    return NextResponse.json({ grants });
  } catch (error) {
    console.error('Failed to list grants:', error);
    return NextResponse.json(
      { error: 'Failed to list grants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/permission-grants
 * Create a temporary permission grant
 */
export async function POST(request: NextRequest) {
  try {
    const { user, clubId, roles, error } = await getClaimsForApiRoute();

    if (error || !user || !clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only FACILITY_ADMIN and CLUB_ADMIN can create grants
    const isAdmin = roles.includes('FACILITY_ADMIN') || roles.includes('CLUB_ADMIN');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createGrantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify grant is for current club
    if (parsed.data.clubId !== clubId) {
      return NextResponse.json(
        { error: 'Cannot create grant for different club' },
        { status: 403 }
      );
    }

    const grant = await createGrant({
      clubId: parsed.data.clubId,
      userId: parsed.data.userId,
      grantedBy: user.id,
      roles: parsed.data.roles as Role[],
      duration: parsed.data.duration,
      reason: parsed.data.reason,
    });

    // Audit log
    const logger = createAuditLogger(request, { userId: user.id, clubId });
    await logger.log({
      action: 'PERMISSION_GRANT_CREATED',
      targetType: 'PermissionGrant',
      targetId: grant.id,
      metadata: {
        grantedUserId: parsed.data.userId,
        roles: parsed.data.roles,
        duration: parsed.data.duration,
        expiresAt: grant.expiresAt.toISOString(),
      },
    });

    // TODO: Send notification to user about new grant (email + in-app)
    // This will be added in the notification plan

    return NextResponse.json({ grant }, { status: 201 });
  } catch (error) {
    console.error('Failed to create grant:', error);
    return NextResponse.json(
      { error: 'Failed to create grant' },
      { status: 500 }
    );
  }
}
