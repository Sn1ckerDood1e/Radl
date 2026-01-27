import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; blockId: string }>;
}

const updateBlockSchema = z.object({
  title: z.string().max(100).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// GET single block
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Verify practice belongs to team
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    const block = await prisma.practiceBlock.findUnique({
      where: { id: blockId },
      include: {
        lineup: {
          include: {
            boat: true,
            seats: {
              include: { athlete: true },
              orderBy: { position: 'asc' },
            },
          },
        },
        landAssignments: {
          include: { athlete: true },
        },
        workout: {
          include: {
            intervals: { orderBy: { position: 'asc' } },
          },
        },
      },
    });

    if (!block || block.practiceId !== practiceId) {
      return notFoundResponse('Block');
    }

    return NextResponse.json({ block });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]:GET');
  }
}

// PATCH single block field(s)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update blocks');

    // Verify practice belongs to team
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block belongs to practice
    const existingBlock = await prisma.practiceBlock.findUnique({
      where: { id: blockId },
      select: { practiceId: true },
    });

    if (!existingBlock || existingBlock.practiceId !== practiceId) {
      return notFoundResponse('Block');
    }

    const body = await request.json();
    const validationResult = updateBlockSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    const block = await prisma.practiceBlock.update({
      where: { id: blockId },
      data: validated,
    });

    return NextResponse.json({ block });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]:PATCH');
  }
}

// DELETE block
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId, blockId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete blocks');

    // Verify practice belongs to team
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    // Verify block belongs to practice
    const existingBlock = await prisma.practiceBlock.findUnique({
      where: { id: blockId },
      select: { practiceId: true },
    });

    if (!existingBlock || existingBlock.practiceId !== practiceId) {
      return notFoundResponse('Block');
    }

    await prisma.practiceBlock.delete({
      where: { id: blockId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/[blockId]:DELETE');
  }
}
