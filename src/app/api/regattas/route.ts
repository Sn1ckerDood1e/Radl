import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createRegattaSchema } from '@/lib/validations/regatta';

// GET: List regattas for team (optionally filtered by season)
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: Record<string, unknown> = { teamId: claims.team_id };
    if (seasonId) where.seasonId = seasonId;
    if (upcoming) where.startDate = { gte: new Date() };

    const regattas = await prisma.regatta.findMany({
      where,
      include: {
        season: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ regattas });
  } catch (error) {
    return serverErrorResponse(error, 'regattas:GET');
  }
}

// POST: Create manual regatta
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create regattas');

    const body = await request.json();
    const validationResult = createRegattaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { seasonId, name, location, venue, timezone, startDate, endDate } = validationResult.data;

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Season not found or does not belong to your team' },
        { status: 404 }
      );
    }

    const regatta = await prisma.regatta.create({
      data: {
        teamId: claims.team_id,
        seasonId,
        name,
        location: location || null,
        venue: venue || null,
        timezone: timezone || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        source: 'MANUAL',
      },
      include: {
        season: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ regatta }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'regattas:POST');
  }
}
