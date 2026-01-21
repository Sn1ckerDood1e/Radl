import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { createLineupSchema } from '@/lib/validations/lineup';
import { createUsageLog, deleteUsageLogForLineup } from '@/lib/equipment/usage-logger';

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

// GET: Get lineup for a specific block
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Verify practice exists and belongs to team
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        teamId: claims.team_id,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block exists and belongs to practice
    const block = await prisma.practiceBlock.findFirst({
      where: {
        id: blockId,
        practiceId,
      },
    });

    if (!block) return notFoundResponse('Block');

    // Get lineup if exists
    const lineup = await prisma.lineup.findUnique({
      where: { blockId },
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
      },
    });

    return NextResponse.json({ lineup: lineup || null });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/lineup:GET');
  }
}

// PUT: Create or replace lineup for a block (coach only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create lineups');

    // Verify practice exists and belongs to team
    const practice = await prisma.practice.findFirst({
      where: {
        id: practiceId,
        teamId: claims.team_id,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block exists and belongs to practice
    const block = await prisma.practiceBlock.findFirst({
      where: {
        id: blockId,
        practiceId,
      },
    });

    if (!block) return notFoundResponse('Block');

    // Verify block is WATER type
    if (block.type !== 'WATER') {
      return NextResponse.json(
        { error: 'Lineups can only be created for water blocks' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate lineup data (but blockId comes from URL, not body)
    const validationData = {
      blockId,
      boatId: body.boatId,
      notes: body.notes,
      seats: body.seats,
    };

    const validationResult = createLineupSchema.safeParse(validationData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { boatId, notes, seats } = validationResult.data;

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

    // Use transaction to replace lineup
    const lineup = await prisma.$transaction(async (tx) => {
      // Check if lineup exists
      const existing = await tx.lineup.findUnique({
        where: { blockId },
      });

      // Track old boat for usage log cleanup
      const oldBoatId = existing?.boatId;

      // If exists, delete it (and its usage logs will be handled after)
      if (existing) {
        await tx.lineup.delete({
          where: { blockId },
        });
      }

      // Create new lineup with seats
      const newLineup = await tx.lineup.create({
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
        },
      });

      return { lineup: newLineup, oldBoatId };
    });

    // Handle usage log changes after transaction completes
    try {
      // If old lineup had a boat, delete its usage log
      if (lineup.oldBoatId) {
        // Note: deleteUsageLogForLineup uses lineupId, but old lineup is deleted
        // We need to delete by equipment + practice instead
        await prisma.equipmentUsageLog.deleteMany({
          where: {
            equipmentId: lineup.oldBoatId,
            practiceId,
          },
        });
      }

      // If new lineup has a boat, create usage log
      if (boatId) {
        await createUsageLog({
          equipmentId: boatId,
          teamId: claims.team_id,
          practiceId,
          lineupId: lineup.lineup.id,
          usageDate: practice.date,
        });
      }
    } catch (error) {
      // Log warning but don't fail the request - usage logs are supplementary
      console.warn('Failed to update usage log:', error);
    }

    return NextResponse.json({ lineup: lineup.lineup }, { status: 200 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/lineup:PUT');
  }
}
