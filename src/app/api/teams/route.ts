import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { createTeamSchema } from '@/lib/validations/team';
import { generateSlug } from '@/lib/utils/slug';
import { generateTeamCode } from '@/lib/utils/team-code';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTeamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, primaryColor, secondaryColor } = validationResult.data;

    // Generate unique slug (append random suffix if collision)
    let slug = generateSlug(name);
    let slugExists = await prisma.team.findUnique({ where: { slug } });

    if (slugExists) {
      // Append 4-char random suffix
      const suffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${suffix}`;
    }

    // Generate team join code
    const joinCode = generateTeamCode();

    // Create team and add coach as member in a transaction
    const team = await prisma.$transaction(async (tx) => {
      // Create Team record
      const newTeam = await tx.team.create({
        data: {
          name,
          slug,
          primaryColor,
          secondaryColor,
          joinCode,
        },
      });

      // Create TeamMember record with COACH role (legacy)
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: user.id,
          role: 'COACH',
        },
      });

      // Create ClubMembership for RBAC (Team.id = ClubMembership.clubId)
      await tx.clubMembership.create({
        data: {
          clubId: newTeam.id,
          userId: user.id,
          roles: ['COACH'],
          isActive: true,
        },
      });

      return newTeam;
    });

    return NextResponse.json(
      {
        success: true,
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          joinCode: team.joinCode,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
