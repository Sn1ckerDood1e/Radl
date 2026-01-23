import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { getCurrentClubId } from '@/lib/auth/club-context';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * GET /api/clubs
 * Returns all clubs the current user is a member of.
 * Used by club switcher component.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Get all active memberships for this user
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
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // Get current club from cookie
    const currentClubId = await getCurrentClubId();

    // Transform to response format
    const clubs = memberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      slug: m.club.slug,
      logoUrl: m.club.logoUrl,
      primaryColor: m.club.primaryColor,
      roles: m.roles,
      isCurrent: m.club.id === currentClubId,
    }));

    // If no current club set but user has clubs, set first one
    // (This handles new users or cleared cookies)
    const needsDefault = !currentClubId && clubs.length > 0;

    return NextResponse.json({
      clubs,
      currentClubId: currentClubId || (clubs[0]?.id ?? null),
      needsDefault,
    });
  } catch (error) {
    return serverErrorResponse(error, 'clubs:GET');
  }
}
