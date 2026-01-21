import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { reorderBlocksSchema } from '@/lib/validations/practice';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Reorder blocks in practice (coach only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: practiceId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can reorder blocks');

    // Verify practice ownership
    const practice = await prisma.practice.findFirst({
      where: { id: practiceId, teamId: claims.team_id },
      include: {
        blocks: true,
      },
    });

    if (!practice) return notFoundResponse('Practice');

    const body = await request.json();
    const validationResult = reorderBlocksSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { positions } = validationResult.data;

    // Validate: all blockIds must belong to this practice
    const practiceBlockIds = new Set(practice.blocks.map(b => b.id));
    const providedBlockIds = new Set(positions.map(p => p.blockId));

    for (const { blockId } of positions) {
      if (!practiceBlockIds.has(blockId)) {
        return NextResponse.json(
          { error: `Block ${blockId} does not belong to this practice` },
          { status: 400 }
        );
      }
    }

    // Validate: all practice blocks must be included
    if (providedBlockIds.size !== practiceBlockIds.size) {
      return NextResponse.json(
        { error: 'All blocks must be included in reorder operation' },
        { status: 400 }
      );
    }

    // Validate: positions must be contiguous (0, 1, 2, ...)
    const sortedPositions = [...positions].sort((a, b) => a.position - b.position);
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i].position !== i) {
        return NextResponse.json(
          { error: 'Positions must be contiguous starting from 0' },
          { status: 400 }
        );
      }
    }

    // Update all block positions atomically
    await prisma.$transaction(async (tx) => {
      for (const { blockId, position } of positions) {
        await tx.practiceBlock.update({
          where: { id: blockId },
          data: { position },
        });
      }
    });

    // Return updated blocks
    const blocks = await prisma.practiceBlock.findMany({
      where: { practiceId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    return serverErrorResponse(error, 'practices/[id]/blocks/reorder:POST');
  }
}
