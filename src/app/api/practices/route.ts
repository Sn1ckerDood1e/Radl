import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { accessibleBy } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createPracticeSchema } from '@/lib/validations/practice';

// GET: List practices for current club
export async function GET(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build base where clause
    const where: Record<string, unknown> = {
      teamId: context.clubId,
    };

    if (seasonId) {
      where.seasonId = seasonId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    try {
      // Use accessibleBy to filter to authorized practices
      const practices = await prisma.practice.findMany({
        where: {
          AND: [
            accessibleBy(context.ability).Practice,
            where,
          ],
        },
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

      // For non-coaches, filter to PUBLISHED only
      // (CASL handles read permission, but status filter is business logic)
      const filteredPractices = context.ability.can('manage', 'Practice')
        ? practices
        : practices.filter(p => p.status === 'PUBLISHED');

      return NextResponse.json({ practices: filteredPractices });
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return NextResponse.json({ practices: [] });
      }
      throw e;
    }
  } catch (error) {
    return serverErrorResponse(error, 'practices:GET');
  }
}

// POST: Create new practice (requires manage permission)
export async function POST(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check create permission
    if (!context.ability.can('create', 'Practice')) {
      return forbiddenResponse('You do not have permission to create practices');
    }

    const body = await request.json();
    const validationResult = createPracticeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { seasonId, name, date, startTime, endTime, notes, blocks } = validationResult.data;

    // Verify season belongs to club
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: context.clubId },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Season not found or does not belong to your club' },
        { status: 404 }
      );
    }

    // Create practice with nested blocks
    const practice = await prisma.practice.create({
      data: {
        teamId: context.clubId,
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
