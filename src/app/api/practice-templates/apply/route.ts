import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { z } from 'zod';
import { set } from 'date-fns';

// Schema for applying a template to create a new practice
const applyTemplateSchema = z.object({
  templateId: z.string().uuid(),
  seasonId: z.string().uuid(),
  date: z.string().datetime(), // The date for the new practice
  name: z.string().min(1).max(100).optional(), // Override template name
});

// POST: Apply template to create a new practice (copy-on-apply pattern)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can apply practice templates');

    const body = await request.json();
    const validationResult = applyTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { templateId, seasonId, date, name } = validationResult.data;

    // Fetch template with blocks, verify ownership
    const template = await prisma.practiceTemplate.findFirst({
      where: {
        id: templateId,
        teamId: claims.team_id,
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!template) return notFoundResponse('Practice template');

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Season not found or does not belong to your team' },
        { status: 404 }
      );
    }

    // Combine date with template's defaultStartTime/defaultEndTime
    const practiceDate = new Date(date);
    const [startHour, startMin] = template.defaultStartTime.split(':').map(Number);
    const [endHour, endMin] = template.defaultEndTime.split(':').map(Number);

    const startTime = set(practiceDate, { hours: startHour, minutes: startMin, seconds: 0, milliseconds: 0 });
    const endTime = set(practiceDate, { hours: endHour, minutes: endMin, seconds: 0, milliseconds: 0 });

    // Create practice with copied blocks (independent copy, no ongoing link)
    const practice = await prisma.practice.create({
      data: {
        teamId: claims.team_id,
        seasonId,
        name: name || template.name,
        date: practiceDate,
        startTime,
        endTime,
        status: 'DRAFT',
        blocks: {
          create: template.blocks.map((block, index) => ({
            position: index,
            type: block.type,
            durationMinutes: block.durationMinutes,
            category: block.category,
            notes: block.notes,
          })),
        },
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ practice }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'practice-templates/apply:POST');
  }
}
