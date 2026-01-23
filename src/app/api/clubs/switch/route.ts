import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { setCurrentClubId } from '@/lib/auth/club-context';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

/**
 * POST /api/clubs/switch
 * Switch to a different club the user is a member of.
 * Stores selection in httpOnly cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    const body = await request.json();
    const { clubId } = body;

    if (!clubId || typeof clubId !== 'string') {
      return NextResponse.json(
        { error: 'clubId is required' },
        { status: 400 }
      );
    }

    // Verify user has active membership in target club
    const membership = await prisma.clubMembership.findFirst({
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
          },
        },
      },
    });

    if (!membership) {
      return forbiddenResponse('Not a member of this club');
    }

    // Set the club cookie
    await setCurrentClubId(clubId);

    return NextResponse.json({
      success: true,
      club: membership.club,
      roles: membership.roles,
    });
  } catch (error) {
    return serverErrorResponse(error, 'clubs/switch:POST');
  }
}
