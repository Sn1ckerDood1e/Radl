import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ facilityId: string }>;
}

// GET /api/facility/[facilityId]/clubs - List clubs in facility
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { facilityId } = await context.params;

    const { user, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Verify user has access to this facility
    const membership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
      },
    });

    if (!membership) {
      return forbiddenResponse('Facility membership required');
    }

    const clubs = await prisma.team.findMany({
      where: { facilityId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ clubs });
  } catch (err) {
    return serverErrorResponse(err, 'facility-clubs:GET');
  }
}
