import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { accessibleBy } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { createLineupSchema } from '@/lib/validations/lineup';
import { createUsageLog } from '@/lib/equipment/usage-logger';

// POST: Create new lineup for a water block
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
    if (!context.ability.can('create', 'Lineup')) {
      return forbiddenResponse('You do not have permission to create lineups');
    }

    const body = await request.json();
    const validationResult = createLineupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { blockId, boatId, notes, seats } = validationResult.data;

    // Verify block exists and belongs to club (via Practice)
    const block = await prisma.practiceBlock.findFirst({
      where: {
        id: blockId,
        practice: {
          teamId: context.clubId,
        },
      },
      include: {
        practice: true,
      },
    });

    if (!block) {
      return NextResponse.json(
        { error: 'Block not found or does not belong to your club' },
        { status: 404 }
      );
    }

    // Verify block is WATER type
    if (block.type !== 'WATER') {
      return NextResponse.json(
        { error: 'Lineups can only be created for water blocks' },
        { status: 400 }
      );
    }

    // Check if block already has a lineup (findFirst for current single-lineup logic)
    const existingLineup = await prisma.lineup.findFirst({
      where: { blockId },
    });

    if (existingLineup) {
      return NextResponse.json(
        { error: 'Block already has a lineup' },
        { status: 400 }
      );
    }

    // If boatId provided, verify it exists, belongs to club, and is SHELL type
    if (boatId) {
      const boat = await prisma.equipment.findFirst({
        where: {
          id: boatId,
          teamId: context.clubId,
          type: 'SHELL',
        },
      });

      if (!boat) {
        return NextResponse.json(
          { error: 'Boat not found, does not belong to your club, or is not a shell' },
          { status: 404 }
        );
      }
    }

    // Verify all athletes belong to the club
    const athleteIds = seats.map((s) => s.athleteId);
    const athletes = await prisma.athleteProfile.findMany({
      where: {
        id: { in: athleteIds },
        teamMember: {
          teamId: context.clubId,
        },
      },
    });

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or do not belong to your club' },
        { status: 400 }
      );
    }

    // Create lineup with nested seats
    const lineup = await prisma.lineup.create({
      data: {
        blockId,
        boatId: boatId || null,
        notes: notes || null,
        seats: {
          create: seats.map((seat) => ({
            athleteId: seat.athleteId,
            position: seat.position,
            side: seat.side,
          })),
        },
      },
      include: {
        seats: {
          include: {
            athlete: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        boat: true,
        block: true,
      },
    });

    // Create usage log if boat was assigned
    if (boatId) {
      try {
        await createUsageLog({
          equipmentId: boatId,
          teamId: context.clubId,
          practiceId: block.practice.id,
          lineupId: lineup.id,
          usageDate: block.practice.date,
        });
      } catch (error) {
        // Log warning but don't fail the request - usage logs are supplementary
        console.warn('Failed to create usage log:', error);
      }
    }

    return NextResponse.json({ lineup }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'lineups:POST');
  }
}

// GET: List lineups for a practice (optional, for listing)
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
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json(
        { error: 'practiceId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify practice exists and belongs to club
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        teamId: context.clubId,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    try {
      // Get all lineups for practice blocks using accessibleBy
      const lineups = await prisma.lineup.findMany({
        where: {
          AND: [
            accessibleBy(context.ability).Lineup,
            {
              block: {
                practiceId,
              },
            },
          ],
        },
        include: {
          seats: {
            include: {
              athlete: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          boat: true,
          block: true,
        },
      });

      return NextResponse.json({ lineups });
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return NextResponse.json({ lineups: [] });
      }
      throw e;
    }
  } catch (error) {
    return serverErrorResponse(error, 'lineups:GET');
  }
}
