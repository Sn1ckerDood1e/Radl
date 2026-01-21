import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Publish practice (coach only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can publish practices');

    // Update status to PUBLISHED
    const result = await prisma.practice.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: {
        status: 'PUBLISHED',
      },
    });

    if (result.count === 0) return notFoundResponse('Practice');

    const practice = await prisma.practice.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ practice });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/publish:POST');
  }
}
