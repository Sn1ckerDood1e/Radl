import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { moveClubSchema } from '@/lib/validations/club';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ clubId: string }>;
}

/**
 * POST /api/admin/clubs/[clubId]/move
 *
 * Move a club to a different facility (CLUB-06).
 * Super admin only.
 *
 * Request body: { targetFacilityId: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { clubId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clubId)) {
      return notFoundResponse('Club');
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate request body
    const parseResult = moveClubSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { targetFacilityId } = parseResult.data;

    // Get current club with facility info
    const club = await prisma.team.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        slug: true,
        facilityId: true,
        facility: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!club) {
      return notFoundResponse('Club');
    }

    // Check if already at target facility
    if (club.facilityId === targetFacilityId) {
      return NextResponse.json(
        { error: 'Club is already at this facility' },
        { status: 400 }
      );
    }

    // Verify target facility exists
    const targetFacility = await prisma.facility.findUnique({
      where: { id: targetFacilityId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!targetFacility) {
      return notFoundResponse('Target facility');
    }

    // Update club's facility
    const updatedClub = await prisma.team.update({
      where: { id: clubId },
      data: {
        facilityId: targetFacilityId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        facilityId: true,
        updatedAt: true,
      },
    });

    // Log admin action with before/after state and MOVE_CLUB metadata
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_CLUB_UPDATED',
      targetType: 'Club',
      targetId: clubId,
      beforeState: {
        facilityId: club.facilityId,
        facilityName: club.facility?.name || null,
      },
      afterState: {
        facilityId: targetFacilityId,
        facilityName: targetFacility.name,
      },
      metadata: {
        action: 'MOVE_CLUB',
        fromFacilityId: club.facilityId,
        fromFacilityName: club.facility?.name || null,
        toFacilityId: targetFacilityId,
        toFacilityName: targetFacility.name,
      },
    });

    return NextResponse.json({
      success: true,
      club: {
        ...updatedClub,
        facility: targetFacility,
      },
      move: {
        from: club.facility
          ? {
              id: club.facility.id,
              name: club.facility.name,
              slug: club.facility.slug,
            }
          : null,
        to: {
          id: targetFacility.id,
          name: targetFacility.name,
          slug: targetFacility.slug,
        },
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs/[clubId]/move:POST');
  }
}
