import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { createLineupSchema } from '@/lib/validations/lineup';
import { createUsageLog } from '@/lib/equipment/usage-logger';

// POST: Create new lineup for a water block
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create lineups');

    const body = await request.json();
    const validationResult = createLineupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { blockId, boatId, notes, seats } = validationResult.data;

    // Verify block exists and belongs to team (via Practice)
    const block = await prisma.practiceBlock.findFirst({
      where: {
        id: blockId,
        practice: {
          teamId: claims.team_id,
        },
      },
      include: {
        practice: true,
      },
    });

    if (!block) {
      return NextResponse.json(
        { error: 'Block not found or does not belong to your team' },
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

    // Check if block already has a lineup
    const existingLineup = await prisma.lineup.findUnique({
      where: { blockId },
    });

    if (existingLineup) {
      return NextResponse.json(
        { error: 'Block already has a lineup' },
        { status: 400 }
      );
    }

    // If boatId provided, verify it exists, belongs to team, and is SHELL type
    if (boatId) {
      const boat = await prisma.equipment.findFirst({
        where: {
          id: boatId,
          teamId: claims.team_id,
          type: 'SHELL',
        },
      });

      if (!boat) {
        return NextResponse.json(
          { error: 'Boat not found, does not belong to your team, or is not a shell' },
          { status: 404 }
        );
      }
    }

    // Verify all athletes belong to the team
    const athleteIds = seats.map((s) => s.athleteId);
    const athletes = await prisma.athleteProfile.findMany({
      where: {
        id: { in: athleteIds },
        teamMember: {
          teamId: claims.team_id,
        },
      },
    });

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or do not belong to your team' },
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
          teamId: claims.team_id,
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
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const practiceId = searchParams.get('practiceId');

    if (!practiceId) {
      return NextResponse.json(
        { error: 'practiceId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify practice exists and belongs to team
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        teamId: claims.team_id,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    // Get all lineups for practice blocks
    const lineups = await prisma.lineup.findMany({
      where: {
        block: {
          practiceId,
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

    return NextResponse.json({ lineups });
  } catch (error) {
    return serverErrorResponse(error, 'lineups:GET');
  }
}
