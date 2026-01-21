import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createPracticeSchema } from '@/lib/validations/practice';

// GET: List practices for current team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause with team isolation
    const where: {
      teamId: string;
      seasonId?: string;
      status?: 'PUBLISHED';
      date?: { gte?: Date; lte?: Date };
    } = {
      teamId: claims.team_id,
    };

    // Filter by season if provided
    if (seasonId) {
      where.seasonId = seasonId;
    }

    // Athletes only see PUBLISHED practices
    if (claims.user_role !== 'COACH') {
      where.status = 'PUBLISHED';
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const practices = await prisma.practice.findMany({
      where,
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json({ practices });
  } catch (error) {
    return serverErrorResponse(error, 'practices:GET');
  }
}

// POST: Create new practice with blocks (coach only)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create practices');

    const body = await request.json();
    const validationResult = createPracticeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { seasonId, name, date, startTime, endTime, notes, blocks } = validationResult.data;

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

    // Create practice with nested blocks
    const practice = await prisma.practice.create({
      data: {
        teamId: claims.team_id,
        seasonId,
        name,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes: notes || null,
        status: 'DRAFT',
        blocks: {
          create: blocks.map((block, index) => ({
            position: index,
            type: block.type,
            durationMinutes: block.durationMinutes || null,
            category: block.category || null,
            notes: block.notes || null,
          })),
        },
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ practice }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'practices:POST');
  }
}
