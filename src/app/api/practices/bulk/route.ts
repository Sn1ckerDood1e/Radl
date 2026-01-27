import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { z } from 'zod';

// Schema for bulk create
const bulkCreateSchema = z.object({
  seasonId: z.string().uuid(),
  dates: z.array(z.string().datetime()).min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  namePattern: z.string().max(100).optional(), // e.g., "Morning Practice"
  templateId: z.string().uuid().optional(),
});

// Schema for bulk delete
const bulkDeleteSchema = z.object({
  practiceIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * POST: Bulk create practices
 *
 * Creates multiple practices based on an array of dates.
 * Optionally applies a template to all created practices.
 * Max 100 practices per request.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    if (!context.ability.can('create', 'Practice')) {
      return forbiddenResponse('You do not have permission to create practices');
    }

    const body = await request.json();
    const validationResult = bulkCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Verify season belongs to club
    const season = await prisma.season.findFirst({
      where: { id: validated.seasonId, teamId: context.clubId },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Fetch template if provided
    let templateBlocks: Array<{
      type: 'WATER' | 'ERG' | 'LAND' | 'MEETING';
      durationMinutes: number | null;
      category: string | null;
      notes: string | null;
    }> = [];

    if (validated.templateId) {
      const template = await prisma.practiceTemplate.findFirst({
        where: { id: validated.templateId, teamId: context.clubId },
        include: {
          blocks: { orderBy: { position: 'asc' } },
        },
      });

      if (template) {
        templateBlocks = template.blocks;
      }
    }

    // Create all practices in a transaction
    const practices = await prisma.$transaction(
      validated.dates.map((dateStr) => {
        const date = new Date(dateStr);
        const [startHour, startMin] = validated.startTime.split(':').map(Number);
        const [endHour, endMin] = validated.endTime.split(':').map(Number);

        const startTime = new Date(date);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, endMin, 0, 0);

        // Generate practice name
        const name = validated.namePattern
          ? validated.namePattern
          : `Practice - ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;

        return prisma.practice.create({
          data: {
            teamId: context.clubId,
            seasonId: validated.seasonId,
            name,
            date,
            startTime,
            endTime,
            status: 'DRAFT',
            // Create blocks from template if provided
            blocks: templateBlocks.length > 0
              ? {
                  create: templateBlocks.map((block, pos) => ({
                    position: pos,
                    type: block.type,
                    title: block.notes, // Use template notes as title
                    durationMinutes: block.durationMinutes,
                    category: block.category,
                    notes: block.notes,
                  })),
                }
              : undefined,
          },
        });
      })
    );

    return NextResponse.json(
      {
        success: true,
        count: practices.length,
        practiceIds: practices.map(p => p.id),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return serverErrorResponse(error, 'practices/bulk:POST');
  }
}

/**
 * DELETE: Bulk delete practices
 *
 * Deletes multiple practices by ID.
 * Only deletes practices that belong to the user's club.
 * Max 100 practices per request.
 */
export async function DELETE(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    if (!context.ability.can('delete', 'Practice')) {
      return forbiddenResponse('You do not have permission to delete practices');
    }

    const body = await request.json();
    const validationResult = bulkDeleteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    // Delete only practices that belong to this club
    const deleteResult = await prisma.practice.deleteMany({
      where: {
        id: { in: validated.practiceIds },
        teamId: context.clubId,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: deleteResult.count,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return serverErrorResponse(error, 'practices/bulk:DELETE');
  }
}
