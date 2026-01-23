import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { setCurrentFacilityId, clearCurrentFacilityId } from '@/lib/auth/facility-context';
import { setCurrentClubId, clearCurrentClubId } from '@/lib/auth/club-context';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

/**
 * POST /api/context/switch
 * Unified context switch endpoint for facility-level and club-level views.
 *
 * Request body:
 * - facilityId (required): Facility to switch to
 * - clubId (optional): Club to switch to within facility (omit for facility-level view)
 *
 * Returns:
 * - viewMode: 'facility' | 'club'
 * - facility: { id, name, slug }
 * - club: { id, name, slug } (only for club view)
 * - roles: string[] (only for club view)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    const body = await request.json();
    const { facilityId, clubId } = body;

    // Validate request
    if (!facilityId || typeof facilityId !== 'string') {
      return NextResponse.json(
        { error: 'facilityId is required' },
        { status: 400 }
      );
    }

    if (clubId !== undefined && typeof clubId !== 'string') {
      return NextResponse.json(
        { error: 'clubId must be a string if provided' },
        { status: 400 }
      );
    }

    // Case 1: Facility-level view (no clubId)
    if (!clubId) {
      // Verify user has FacilityMembership with FACILITY_ADMIN role
      const facilityMembership = await prisma.facilityMembership.findFirst({
        where: {
          facilityId,
          userId: user.id,
          isActive: true,
          roles: {
            has: 'FACILITY_ADMIN',
          },
        },
        include: {
          facility: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!facilityMembership) {
        return forbiddenResponse('Not a facility admin for this facility');
      }

      // Set facility cookie and clear club cookie
      await setCurrentFacilityId(facilityId);
      await clearCurrentClubId();

      return NextResponse.json({
        success: true,
        viewMode: 'facility',
        facility: facilityMembership.facility,
      });
    }

    // Case 2: Club view (both facilityId and clubId)
    // Verify ClubMembership
    const clubMembership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        isActive: true,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            facilityId: true,
          },
        },
      },
    });

    if (!clubMembership) {
      return forbiddenResponse('Not a member of this club');
    }

    // Verify club belongs to specified facility
    if (clubMembership.club.facilityId !== facilityId) {
      return NextResponse.json(
        { error: 'Club does not belong to the specified facility' },
        { status: 400 }
      );
    }

    // Set both facility and club cookies
    await setCurrentFacilityId(facilityId);
    await setCurrentClubId(clubId);

    return NextResponse.json({
      success: true,
      viewMode: 'club',
      club: {
        id: clubMembership.club.id,
        name: clubMembership.club.name,
        slug: clubMembership.club.slug,
      },
      roles: clubMembership.roles,
    });
  } catch (error) {
    return serverErrorResponse(error, 'context/switch:POST');
  }
}
