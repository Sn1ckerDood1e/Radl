import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

const seatSchema = z.object({
  position: z.number().int().min(1),
  side: z.enum(['PORT', 'STARBOARD', 'NONE']),
  athleteId: z.string().uuid().nullable(),
});

const lineupSchema = z.object({
  id: z.string(), // Can be UUID or "new-{timestamp}" for new lineups
  boatId: z.string().uuid().nullable(),
  seats: z.array(seatSchema),
});

const bulkLineupsSchema = z.object({
  lineups: z.array(lineupSchema).max(10), // Max 10 boats per block
});

// GET: Fetch lineups for a block
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const lineups = await prisma.lineup.findMany({
      where: { blockId },
      include: {
        boat: true,
        seats: {
          orderBy: { position: 'asc' },
          include: {
            athlete: {
              select: { id: true, displayName: true, sidePreference: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ lineups });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/lineups:GET');
  }
}

// PUT: Bulk save lineups for a block
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update lineups');

    // Verify practice belongs to team
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block belongs to practice and is WATER type
    const block = await prisma.practiceBlock.findUnique({
      where: { id: blockId },
      select: { practiceId: true, type: true },
    });

    if (!block || block.practiceId !== practiceId) {
      return notFoundResponse('Block');
    }

    if (block.type !== 'WATER') {
      return NextResponse.json(
        { error: 'Lineups only supported for WATER blocks' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = bulkLineupsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Process lineups in transaction
    await prisma.$transaction(async (tx) => {
      // Get existing lineups for this block
      const existingLineups = await tx.lineup.findMany({
        where: { blockId },
        select: { id: true },
      });
      const existingIds = new Set(existingLineups.map(l => l.id));

      // Determine which lineups to create, update, or delete
      const submittedIds = new Set<string>();
      const isNewId = (id: string) => id.startsWith('new-');

      for (const lineup of validated.lineups) {
        if (isNewId(lineup.id)) {
          // Create new lineup
          await tx.lineup.create({
            data: {
              blockId,
              boatId: lineup.boatId,
              seats: {
                create: lineup.seats
                  .filter(s => s.athleteId)
                  .map(s => ({
                    position: s.position,
                    side: s.side,
                    athleteId: s.athleteId!,
                  })),
              },
            },
          });
        } else {
          // Update existing lineup
          submittedIds.add(lineup.id);

          // Update lineup itself
          await tx.lineup.update({
            where: { id: lineup.id },
            data: { boatId: lineup.boatId },
          });

          // Delete all existing seats
          await tx.seatAssignment.deleteMany({
            where: { lineupId: lineup.id },
          });

          // Create new seats
          if (lineup.seats.some(s => s.athleteId)) {
            await tx.seatAssignment.createMany({
              data: lineup.seats
                .filter(s => s.athleteId)
                .map(s => ({
                  lineupId: lineup.id,
                  position: s.position,
                  side: s.side,
                  athleteId: s.athleteId!,
                })),
            });
          }
        }
      }

      // Delete lineups that weren't submitted (removed by user)
      const lineupsToDelete = [...existingIds].filter(id => !submittedIds.has(id));
      if (lineupsToDelete.length > 0) {
        await tx.lineup.deleteMany({
          where: { id: { in: lineupsToDelete } },
        });
      }
    });

    // Fetch updated lineups
    const lineups = await prisma.lineup.findMany({
      where: { blockId },
      include: {
        boat: true,
        seats: {
          orderBy: { position: 'asc' },
          include: {
            athlete: {
              select: { id: true, displayName: true, sidePreference: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ lineups });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]/lineups:PUT');
  }
}
