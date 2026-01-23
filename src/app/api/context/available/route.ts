import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * Response type for GET /api/context/available
 */
export interface AvailableContextsResponse {
  facility?: {
    id: string;
    name: string;
    slug: string;
    isFacilityAdmin: boolean;
  };
  clubs: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string;
    roles: string[];
  }>;
  currentContext: {
    viewMode: 'facility' | 'club' | null;
    facilityId: string | null;
    clubId: string | null;
  };
}

/**
 * GET /api/context/available
 * Returns all contexts (facility and clubs) available to the current user.
 *
 * Response includes:
 * - facility: Present if user belongs to clubs within a facility
 * - clubs: All clubs the user is a member of
 * - currentContext: The user's current selection (from claims/cookies)
 */
export async function GET() {
  try {
    const { user, facilityId, clubId, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Get user's club memberships with club and facility relations
    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            facilityId: true,
            facility: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        club: {
          name: 'asc',
        },
      },
    });

    // Map to clubs array
    const clubs = memberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      slug: m.club.slug,
      logoUrl: m.club.logoUrl,
      primaryColor: m.club.primaryColor,
      roles: m.roles,
    }));

    // Determine facility if clubs belong to one
    // (for now, assume all user's clubs belong to same facility if facilityId exists)
    let facility: AvailableContextsResponse['facility'] | undefined;

    // Find unique facility from clubs
    const facilitiesFromClubs = memberships
      .filter((m) => m.club.facility)
      .map((m) => m.club.facility!)
      .filter((f, i, arr) => arr.findIndex((x) => x.id === f.id) === i);

    if (facilitiesFromClubs.length === 1) {
      const facilityInfo = facilitiesFromClubs[0];

      // Check if user is a facility admin
      const facilityMembership = await prisma.facilityMembership.findFirst({
        where: {
          facilityId: facilityInfo.id,
          userId: user.id,
          isActive: true,
          roles: {
            has: 'FACILITY_ADMIN',
          },
        },
      });

      facility = {
        id: facilityInfo.id,
        name: facilityInfo.name,
        slug: facilityInfo.slug,
        isFacilityAdmin: !!facilityMembership,
      };
    }

    const response: AvailableContextsResponse = {
      facility,
      clubs,
      currentContext: {
        viewMode,
        facilityId,
        clubId,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return serverErrorResponse(error, 'context/available:GET');
  }
}
