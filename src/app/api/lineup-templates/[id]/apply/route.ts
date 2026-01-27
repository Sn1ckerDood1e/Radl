import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { z } from 'zod';
import { createUsageLog } from '@/lib/equipment/usage-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const applyTemplateSchema = z.object({
  blockId: z.string().uuid(),
});

type Warning = {
  type: 'missing_athlete' | 'unavailable_boat' | 'boat_class_mismatch';
  message: string;
  position?: number;
  athleteId?: string;
};

// POST: Apply template to create lineup from template
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can apply lineup templates');

    const body = await request.json();
    const validationResult = applyTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { blockId } = validationResult.data;

    // Verify template exists and belongs to team
    const template = await prisma.lineupTemplate.findFirst({
      where: {
        id,
        teamId: claims.team_id,
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
        defaultBoat: true,
      },
    });

    if (!template) return notFoundResponse('Lineup template');

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

    // Check if block already has a lineup (findFirst for current single-lineup logic)
    const existingLineup = await prisma.lineup.findFirst({
      where: { blockId },
    });

    if (existingLineup) {
      return NextResponse.json(
        { error: 'Block already has a lineup. Delete existing lineup before applying template.' },
        { status: 400 }
      );
    }

    // Track warnings for graceful degradation
    const warnings: Warning[] = [];

    // Filter seats to only include those with athletes that still exist on team
    const validSeats = [];
    for (const seat of template.seats) {
      if (seat.athleteId) {
        // Check if athlete still exists on team
        const athlete = await prisma.athleteProfile.findFirst({
          where: {
            id: seat.athleteId,
            teamMember: {
              teamId: claims.team_id,
            },
          },
        });

        if (!athlete) {
          warnings.push({
            type: 'missing_athlete',
            message: `Athlete at position ${seat.position} no longer exists on team`,
            position: seat.position,
            athleteId: seat.athleteId,
          });
          // Skip this seat - don't include it in the lineup
          continue;
        }
      }

      // Include seats with valid athletes OR empty seats
      if (seat.athleteId || !seat.athleteId) {
        validSeats.push({
          athleteId: seat.athleteId,
          position: seat.position,
          side: seat.side,
        });
      }
    }

    // Handle default boat - check if it's still available
    let boatId: string | null = null;
    if (template.defaultBoatId) {
      // Check if boat exists and is a shell
      const boat = await prisma.equipment.findFirst({
        where: {
          id: template.defaultBoatId,
          teamId: claims.team_id,
          type: 'SHELL',
        },
        include: {
          damageReports: {
            where: {
              status: 'OPEN',
            },
          },
        },
      });

      if (!boat) {
        warnings.push({
          type: 'unavailable_boat',
          message: 'Default boat no longer exists on team',
        });
      } else if (boat.boatClass !== template.boatClass) {
        warnings.push({
          type: 'boat_class_mismatch',
          message: `Default boat class (${boat.boatClass}) doesn't match template boat class (${template.boatClass})`,
        });
      } else if (boat.manualUnavailable || boat.damageReports.length > 0) {
        warnings.push({
          type: 'unavailable_boat',
          message: 'Default boat is currently unavailable (damaged or manually marked unavailable)',
        });
      } else {
        // Boat is valid and available
        boatId = boat.id;
      }
    }

    // Create lineup from template (copy-on-apply pattern)
    const lineup = await prisma.lineup.create({
      data: {
        blockId,
        boatId,
        notes: null,
        seats: {
          create: validSeats.filter(s => s.athleteId).map((seat) => ({
            athleteId: seat.athleteId!,
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

    return NextResponse.json({
      lineup,
      warnings: warnings.length > 0 ? warnings : undefined,
    }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'lineup-templates/[id]/apply:POST');
  }
}
