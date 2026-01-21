import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createSeasonSchema } from '@/lib/validations/season';

// GET: List seasons for current team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Check for status filter
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const where: { teamId: string; status?: 'ACTIVE' | 'ARCHIVED' } = {
      teamId: claims.team_id,
    };

    if (statusFilter === 'active') {
      where.status = 'ACTIVE';
    } else if (statusFilter === 'archived') {
      where.status = 'ARCHIVED';
    }

    const seasons = await prisma.season.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // ACTIVE before ARCHIVED
        { startDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ seasons });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

// POST: Create new season (coach only)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create seasons');

    const body = await request.json();
    const validationResult = createSeasonSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, startDate, endDate } = validationResult.data;

    const season = await prisma.season.create({
      data: {
        teamId: claims.team_id,
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
