import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { createBlockSchema } from '@/lib/validations/practice';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE body schema
const deleteBlockSchema = z.object({
  blockId: z.string().uuid(),
});

// POST: Add block to practice (coach only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can add blocks');

    // Verify practice ownership
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
      include: {
        blocks: {
          orderBy: { position: 'desc' },
          take: 1,
        },
      },
    });

    if (!practice) return notFoundResponse('Practice');

    const body = await request.json();
    const validationResult = createBlockSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { type, durationMinutes, category, notes } = validationResult.data;

    // Find max position and add 1
    const maxPosition = practice.blocks.length > 0 ? practice.blocks[0].position : -1;

    const block = await prisma.practiceBlock.create({
      data: {
        practiceId,
        position: maxPosition + 1,
        type,
        durationMinutes: durationMinutes || null,
        category: category || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks:POST');
  }
}

// DELETE: Remove block from practice (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can remove blocks');

    // Verify practice ownership
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
    });

    if (!practice) return notFoundResponse('Practice');

    const body = await request.json();
    const validationResult = deleteBlockSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { blockId } = validationResult.data;

    // Verify block belongs to this practice
    const block = await prisma.practiceBlock.findFirst({
      where: { id: blockId, practiceId },
    });

    if (!block) return notFoundResponse('Block');

    // Delete the block and recompute positions
    await prisma.$transaction(async (tx) => {
      // Delete the block
      await tx.practiceBlock.delete({
        where: { id: blockId },
      });

      // Get remaining blocks ordered by position
      const remainingBlocks = await tx.practiceBlock.findMany({
        where: { practiceId },
        orderBy: { position: 'asc' },
      });

      // Recompute positions to fill gap
      for (let i = 0; i < remainingBlocks.length; i++) {
        if (remainingBlocks[i].position !== i) {
          await tx.practiceBlock.update({
            where: { id: remainingBlocks[i].id },
            data: { position: i },
          });
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks:DELETE');
  }
}
