import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createPracticeTemplateSchema } from '@/lib/validations/template';

// GET: List practice templates for current team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view practice templates');

    const templates = await prisma.practiceTemplate.findMany({
      where: {
        teamId: claims.team_id,
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return serverErrorResponse(error, 'practice-templates:GET');
  }
}

// POST: Create new practice template (coach only)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create practice templates');

    const body = await request.json();
    const validationResult = createPracticeTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, defaultStartTime, defaultEndTime, blocks } = validationResult.data;

    // Create template with nested blocks
    const template = await prisma.practiceTemplate.create({
      data: {
        teamId: claims.team_id,
        name,
        defaultStartTime,
        defaultEndTime,
        blocks: {
          create: blocks.map((block, index) => ({
            position: index,
            type: block.type,
            durationMinutes: block.durationMinutes || null,
            category: block.category || null,
            notes: block.notes || null,
          })),
        },
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'practice-templates:POST');
  }
}
