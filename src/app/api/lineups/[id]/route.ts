import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateLineupSchema } from '@/lib/validations/lineup';
import { createUsageLog, deleteUsageLogForLineup } from '@/lib/equipment/usage-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single lineup with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const lineup = await prisma.lineup.findFirst({
      where: {
        id,
        block: {
          practice: {
            teamId: claims.team_id,
          },
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
        block: {
          include: {
            practice: true,
          },
        },
      },
    });

    if (!lineup) return notFoundResponse('Lineup');

    return NextResponse.json({ lineup });
  } catch (error) {
    return serverErrorResponse(error, 'lineups/[id]:GET');
  }
}

// PATCH: Update lineup (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update lineups');

    const body = await request.json();
    const validationResult = updateLineupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify lineup exists and belongs to team
    const existingLineup = await prisma.lineup.findFirst({
      where: {
        id,
        block: {
          practice: {
            teamId: claims.team_id,
          },
        },
      },
      include: {
        block: {
          include: {
            practice: true,
          },
        },
      },
    });

    if (!existingLineup) return notFoundResponse('Lineup');

    // If boatId changing, verify new boat
    if (data.boatId !== undefined && data.boatId !== null) {
      const boat = await prisma.equipment.findFirst({
        where: {
          id: data.boatId,
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

    // If seats are being updated, verify athletes
    if (data.seats) {
      const athleteIds = data.seats.map((s) => s.athleteId);
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
    }

    // Handle boat assignment changes for usage logging
    const oldBoatId = existingLineup.boatId;
    const newBoatId = data.boatId !== undefined ? data.boatId : oldBoatId;

    // Use transaction for atomic update
    const lineup = await prisma.$transaction(async (tx) => {
      // Update lineup base fields
      const updateData: {
        boatId?: string | null;
        notes?: string | null;
      } = {};

      if (data.boatId !== undefined) updateData.boatId = data.boatId;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await tx.lineup.update({
        where: { id },
        data: updateData,
      });

      // If seats provided, replace all seats
      if (data.seats) {
        // Delete all existing seats
        await tx.seatAssignment.deleteMany({
          where: { lineupId: id },
        });

        // Create new seats
        await tx.seatAssignment.createMany({
          data: data.seats.map((seat) => ({
            lineupId: id,
            athleteId: seat.athleteId,
            position: seat.position,
            side: seat.side,
          })),
        });
      }

      // Fetch and return updated lineup
      return await tx.lineup.findUnique({
        where: { id },
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
    });

    // Handle usage log changes after transaction completes
    try {
      // Boat changed from null to value: create usage log
      if (!oldBoatId && newBoatId) {
        await createUsageLog({
          equipmentId: newBoatId,
          teamId: claims.team_id,
          practiceId: existingLineup.block.practice.id,
          lineupId: id,
          usageDate: existingLineup.block.practice.date,
        });
      }
      // Boat changed from value to null: delete usage log
      else if (oldBoatId && !newBoatId) {
        await deleteUsageLogForLineup(id);
      }
      // Boat changed to different boat: delete old, create new
      else if (oldBoatId && newBoatId && oldBoatId !== newBoatId) {
        await deleteUsageLogForLineup(id);
        await createUsageLog({
          equipmentId: newBoatId,
          teamId: claims.team_id,
          practiceId: existingLineup.block.practice.id,
          lineupId: id,
          usageDate: existingLineup.block.practice.date,
        });
      }
    } catch (error) {
      // Log warning but don't fail the request - usage logs are supplementary
      console.warn('Failed to update usage log:', error);
    }

    return NextResponse.json({ lineup });
  } catch (error) {
    return serverErrorResponse(error, 'lineups/[id]:PATCH');
  }
}

// DELETE: Delete lineup (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete lineups');

    // Verify lineup exists and belongs to team
    const lineup = await prisma.lineup.findFirst({
      where: {
        id,
        block: {
          practice: {
            teamId: claims.team_id,
          },
        },
      },
    });

    if (!lineup) return notFoundResponse('Lineup');

    // Delete usage logs before deleting lineup
    try {
      await deleteUsageLogForLineup(id);
    } catch (error) {
      // Log warning but continue with lineup deletion
      console.warn('Failed to delete usage log:', error);
    }

    // Delete lineup (seats cascade via Prisma schema)
    await prisma.lineup.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'lineups/[id]:DELETE');
  }
}
