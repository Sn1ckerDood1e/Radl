import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createBlockTemplateSchema } from '@/lib/validations/template';
import { BlockType } from '@/generated/prisma';

// GET: List block templates for current team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can view block templates');

    // Optional type filter
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    // Build where clause with team isolation
    const where: {
      teamId: string;
      type?: BlockType;
    } = {
      teamId: claims.team_id,
    };

    // Add type filter if valid
    if (typeParam && ['WATER', 'LAND', 'ERG'].includes(typeParam)) {
      where.type = typeParam as BlockType;
    }

    const templates = await prisma.blockTemplate.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return serverErrorResponse(error, 'block-templates:GET');
  }
}

// POST: Create new block template (coach only)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can create block templates');

    const body = await request.json();
    const validationResult = createBlockTemplateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, type, durationMinutes, category, notes } = validationResult.data;

    const template = await prisma.blockTemplate.create({
      data: {
        teamId: claims.team_id,
        name,
        type,
        durationMinutes: durationMinutes || null,
        category: category || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error, 'block-templates:POST');
  }
}
