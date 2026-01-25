import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// GET: Get facility ID by slug (for client-side API calls)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    const { slug } = await context.params;

    // Verify user has facility context
    if (viewMode !== 'facility') {
      return forbiddenResponse('Facility view required');
    }

    // Get facility by slug
    const facility = await prisma.facility.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Verify user has FACILITY_ADMIN role for this facility
    const facilityMembership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId: facility.id,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!facilityMembership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    return NextResponse.json({ facility });
  } catch (err) {
    return serverErrorResponse(err, 'facility-by-slug:GET');
  }
}
