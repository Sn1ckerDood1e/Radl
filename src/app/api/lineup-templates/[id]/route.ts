import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateLineupTemplateSchema, templateSeatSchema } from '@/lib/validations/lineup';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for optional seats array in PATCH
const patchWithSeatsSchema = updateLineupTemplateSchema.extend({
  seats: z.array(templateSeatSchema).optional(),
});

// GET: Get single lineup template with seats
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view lineup templates');

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

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'lineup-templates/[id]:GET');
  }
}

// PATCH: Update lineup template (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update lineup templates');

    const body = await request.json();
    const validationResult = patchWithSeatsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { seats, ...updateFields } = validationResult.data;

    // Build update data for template fields only
    const updateData: Record<string, any> = {};

    if (updateFields.name !== undefined) updateData.name = updateFields.name;
    if (updateFields.boatClass !== undefined) updateData.boatClass = updateFields.boatClass;
    if (updateFields.defaultBoatId !== undefined) {
      updateData.defaultBoatId = updateFields.defaultBoatId === null ? null : updateFields.defaultBoatId;
    }

    // If defaultBoatId is being updated to a boat (not null), verify it
    if (updateFields.defaultBoatId !== undefined && updateFields.defaultBoatId !== null) {
      // Get the effective boat class (new or existing)
      const existing = await prisma.lineupTemplate.findFirst({
        where: { id, teamId: claims.team_id },
      });
      if (!existing) return notFoundResponse('Lineup template');

      const effectiveBoatClass = updateFields.boatClass || existing.boatClass;

      const boat = await prisma.equipment.findFirst({
        where: {
          id: updateFields.defaultBoatId,
          teamId: claims.team_id,
          type: 'SHELL',
          boatClass: effectiveBoatClass,
        },
      });

      if (!boat) {
        return NextResponse.json(
          { error: 'Default boat not found, does not belong to your team, or does not match boat class' },
          { status: 404 }
        );
      }
    }

    // Use transaction if seats need to be replaced
    if (seats !== undefined) {
      // Verify template exists and belongs to team first
      const existing = await prisma.lineupTemplate.findFirst({
        where: { id, teamId: claims.team_id },
      });
      if (!existing) return notFoundResponse('Lineup template');

      // Verify all athletes (if specified) belong to the team
      const athleteIds = seats
        .filter((s) => s.athleteId)
        .map((s) => s.athleteId as string);

      if (athleteIds.length > 0) {
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

      // Transaction: update template fields, delete old seats, create new seats
      const template = await prisma.$transaction(async (tx) => {
        // Update template fields if any
        if (Object.keys(updateData).length > 0) {
          await tx.lineupTemplate.update({
            where: { id },
            data: updateData,
          });
        }

        // Delete existing seats
        await tx.templateSeat.deleteMany({
          where: { templateId: id },
        });

        // Create new seats
        if (seats.length > 0) {
          await tx.templateSeat.createMany({
            data: seats.map((seat) => ({
              templateId: id,
              athleteId: seat.athleteId || null,
              position: seat.position,
              side: seat.side,
            })),
          });
        }

        // Fetch and return updated template with seats
        return tx.lineupTemplate.findUnique({
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
            defaultBoat: true,
          },
        });
      });

      return NextResponse.json({ template });
    }

    // No seats to update, just update template fields
    const result = await prisma.lineupTemplate.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: updateData,
    });

    if (result.count === 0) return notFoundResponse('Lineup template');

    const template = await prisma.lineupTemplate.findUnique({
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
        defaultBoat: true,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'lineup-templates/[id]:PATCH');
  }
}

// DELETE: Delete lineup template (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete lineup templates');

    // Delete template (seats cascade delete via Prisma schema)
    const result = await prisma.lineupTemplate.deleteMany({
      where: {
        id,
        teamId: claims.team_id,
      },
    });

    if (result.count === 0) return notFoundResponse('Lineup template');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'lineup-templates/[id]:DELETE');
  }
}
