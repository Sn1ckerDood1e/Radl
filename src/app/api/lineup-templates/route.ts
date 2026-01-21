import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createLineupTemplateSchema } from '@/lib/validations/lineup';

// GET: List lineup templates for current team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view lineup templates');

    const { searchParams } = new URL(request.url);
    const boatClass = searchParams.get('boatClass') as import('@/generated/prisma').BoatClass | null;

    const where = {
      teamId: claims.team_id,
      ...(boatClass ? { boatClass } : {}),
    };

    const templates = await prisma.lineupTemplate.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return serverErrorResponse(error, 'lineup-templates:GET');
  }
}

// POST: Create new lineup template (coach only)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create lineup templates');

    const body = await request.json();
    const validationResult = createLineupTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, boatClass, defaultBoatId, seats } = validationResult.data;

    // If defaultBoatId provided, verify it exists, belongs to team, and matches boat class
    if (defaultBoatId) {
      const boat = await prisma.equipment.findFirst({
        where: {
          id: defaultBoatId,
          teamId: claims.team_id,
          type: 'SHELL',
          boatClass,
        },
      });

      if (!boat) {
        return NextResponse.json(
          { error: 'Default boat not found, does not belong to your team, or does not match boat class' },
          { status: 404 }
        );
      }
    }

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

    // Create template with nested seats
    const template = await prisma.lineupTemplate.create({
      data: {
        teamId: claims.team_id,
        name,
        boatClass,
        defaultBoatId: defaultBoatId || null,
        seats: {
          create: seats.map((seat) => ({
            athleteId: seat.athleteId || null,
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
        defaultBoat: true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'lineup-templates:POST');
  }
}
