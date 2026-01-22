import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { entryLineupSchema } from '@/lib/validations/regatta';

interface RouteParams {
  params: Promise<{ id: string; entryId: string }>;
}

// Helper to verify entry access
async function getEntryWithAccess(regattaId: string, entryId: string, teamId: string) {
  return prisma.entry.findFirst({
    where: {
      id: entryId,
      regattaId,
      regatta: { teamId },
    },
    include: {
      regatta: { select: { id: true, name: true, teamId: true } },
    },
  });
}

// GET: Get entry lineup
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    const lineup = await prisma.entryLineup.findUnique({
      where: { entryId },
      include: {
        boat: {
          select: {
            id: true,
            name: true,
            boatClass: true,
            status: true,
            manualUnavailable: true,
          },
        },
        seats: {
          include: {
            athlete: {
              select: {
                id: true,
                displayName: true,
                sidePreference: true,
                canBow: true,
                canCox: true,
              },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ lineup });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/lineup:GET');
  }
}

// PUT: Create or replace entry lineup (upsert)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can assign lineups');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    const body = await request.json();
    // Override entryId from URL
    const validationResult = entryLineupSchema.safeParse({ ...body, entryId });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { boatId, notes, seats } = validationResult.data;

    // Validate boat belongs to team and is a shell
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
          { error: 'Boat not found or is not a shell' },
          { status: 404 }
        );
      }
    }

    // Validate all athletes belong to team
    const athleteIds = seats.map((s) => s.athleteId);
    const athletes = await prisma.athleteProfile.findMany({
      where: {
        id: { in: athleteIds },
        teamMember: { teamId: claims.team_id },
      },
    });

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or do not belong to your team' },
        { status: 400 }
      );
    }

    // Delete existing lineup if exists
    await prisma.entryLineup.deleteMany({
      where: { entryId },
    });

    // Create new lineup with seats
    const lineup = await prisma.entryLineup.create({
      data: {
        entryId,
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
        boat: {
          select: {
            id: true,
            name: true,
            boatClass: true,
          },
        },
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
      },
    });

    return NextResponse.json({ lineup });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/lineup:PUT');
  }
}

// DELETE: Remove entry lineup
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can remove lineups');

    const { id: regattaId, entryId } = await params;
    const entry = await getEntryWithAccess(regattaId, entryId, claims.team_id);

    if (!entry) return notFoundResponse('Entry');

    await prisma.entryLineup.deleteMany({
      where: { entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'entries/[entryId]/lineup:DELETE');
  }
}
