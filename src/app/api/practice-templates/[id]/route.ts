import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updatePracticeTemplateSchema, createTemplateBlockSchema } from '@/lib/validations/template';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Schema for optional blocks array in PATCH
const patchWithBlocksSchema = updatePracticeTemplateSchema.extend({
  blocks: z.array(createTemplateBlockSchema).optional(),
});

// GET: Get single practice template with blocks
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view practice templates');

    const template = await prisma.practiceTemplate.findFirst({
      where: {
        id,
        teamId: claims.team_id,
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!template) return notFoundResponse('Practice template');

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'practice-templates/[id]:GET');
  }
}

// PATCH: Update practice template (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update practice templates');

    const body = await request.json();
    const validationResult = patchWithBlocksSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { blocks, ...updateFields } = validationResult.data;

    // Build update data for template fields only
    const updateData: {
      name?: string;
      defaultStartTime?: string;
      defaultEndTime?: string;
    } = {};

    if (updateFields.name !== undefined) updateData.name = updateFields.name;
    if (updateFields.defaultStartTime !== undefined) updateData.defaultStartTime = updateFields.defaultStartTime;
    if (updateFields.defaultEndTime !== undefined) updateData.defaultEndTime = updateFields.defaultEndTime;

    // Validate time ordering if both times are being updated
    if (updateData.defaultStartTime || updateData.defaultEndTime) {
      const existing = await prisma.practiceTemplate.findFirst({
        where: { id, teamId: claims.team_id },
      });
      if (!existing) return notFoundResponse('Practice template');

      const effectiveStart = updateData.defaultStartTime || existing.defaultStartTime;
      const effectiveEnd = updateData.defaultEndTime || existing.defaultEndTime;

      // Parse times to compare
      const [startHour, startMin] = effectiveStart.split(':').map(Number);
      const [endHour, endMin] = effectiveEnd.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    }

    // Use transaction if blocks need to be replaced
    if (blocks !== undefined) {
      // Verify template exists and belongs to team first
      const existing = await prisma.practiceTemplate.findFirst({
        where: { id, teamId: claims.team_id },
      });
      if (!existing) return notFoundResponse('Practice template');

      // Transaction: update template fields, delete old blocks, create new blocks
      const template = await prisma.$transaction(async (tx) => {
        // Update template fields if any
        if (Object.keys(updateData).length > 0) {
          await tx.practiceTemplate.update({
            where: { id },
            data: updateData,
          });
        }

        // Delete existing blocks
        await tx.templateBlock.deleteMany({
          where: { templateId: id },
        });

        // Create new blocks
        if (blocks.length > 0) {
          await tx.templateBlock.createMany({
            data: blocks.map((block, index) => ({
              templateId: id,
              position: index,
              type: block.type,
              durationMinutes: block.durationMinutes || null,
              category: block.category || null,
              notes: block.notes || null,
            })),
          });
        }

        // Fetch and return updated template with blocks
        return tx.practiceTemplate.findUnique({
          where: { id },
          include: {
            blocks: {
              orderBy: { position: 'asc' },
            },
          },
        });
      });

      return NextResponse.json({ template });
    }

    // No blocks to update, just update template fields
    const result = await prisma.practiceTemplate.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: updateData,
    });

    if (result.count === 0) return notFoundResponse('Practice template');

    const template = await prisma.practiceTemplate.findUnique({
      where: { id },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return serverErrorResponse(error, 'practice-templates/[id]:PATCH');
  }
}

// DELETE: Delete practice template (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete practice templates');

    // Delete template (blocks cascade delete via Prisma schema)
    const result = await prisma.practiceTemplate.deleteMany({
      where: {
        id,
        teamId: claims.team_id,
      },
    });

    if (result.count === 0) return notFoundResponse('Practice template');

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error, 'practice-templates/[id]:DELETE');
  }
}
