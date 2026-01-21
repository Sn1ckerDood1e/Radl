import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

// Schema for updating team settings
const updateSettingsSchema = z.object({
  damageNotifyUserIds: z.array(z.string().uuid()).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// GET: Get team settings, coaches list, and team info
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Get team, settings, and coaches in parallel
    const [team, settings, coaches] = await Promise.all([
      prisma.team.findUnique({
        where: { id: claims.team_id },
        select: {
          name: true,
          primaryColor: true,
          secondaryColor: true,
        },
      }),
      prisma.teamSettings.findUnique({
        where: { teamId: claims.team_id },
      }),
      prisma.teamMember.findMany({
        where: {
          teamId: claims.team_id,
          role: 'COACH',
        },
        include: {
          athleteProfile: {
            select: { displayName: true },
          },
        },
      }),
    ]);

    const settingsResponse = settings || {
      damageNotifyUserIds: [],
    };

    return NextResponse.json({
      team: team ? {
        name: team.name,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      } : null,
      settings: {
        damageNotifyUserIds: settingsResponse.damageNotifyUserIds,
      },
      coaches: coaches.map(coach => ({
        userId: coach.userId,
        displayName: coach.athleteProfile?.displayName || `Coach (${coach.userId.slice(0, 8)}...)`,
      })),
    });
  } catch (error) {
    return serverErrorResponse(error, 'team-settings:GET');
  }
}

// PATCH: Update team settings or team colors (coach only)
export async function PATCH(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update team settings');

    const body = await request.json();
    const validationResult = updateSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { damageNotifyUserIds, primaryColor, secondaryColor } = validationResult.data;

    // Handle team color updates
    if (primaryColor !== undefined || secondaryColor !== undefined) {
      const updateData: { primaryColor?: string; secondaryColor?: string } = {};
      if (primaryColor) updateData.primaryColor = primaryColor;
      if (secondaryColor) updateData.secondaryColor = secondaryColor;

      await prisma.team.update({
        where: { id: claims.team_id },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        team: updateData,
      });
    }

    // Handle notification settings updates
    if (damageNotifyUserIds !== undefined) {
      // Validate that all userIds are team members
      if (damageNotifyUserIds.length > 0) {
        const validMembers = await prisma.teamMember.findMany({
          where: {
            teamId: claims.team_id,
            userId: { in: damageNotifyUserIds },
          },
          select: { userId: true },
        });

        const validUserIds = new Set(validMembers.map(m => m.userId));
        const invalidUserIds = damageNotifyUserIds.filter(id => !validUserIds.has(id));

        if (invalidUserIds.length > 0) {
          return NextResponse.json(
            { error: 'Some userIds are not team members', invalidUserIds },
            { status: 400 }
          );
        }
      }

      // Upsert team settings
      const settings = await prisma.teamSettings.upsert({
        where: { teamId: claims.team_id },
        update: { damageNotifyUserIds },
        create: {
          teamId: claims.team_id,
          damageNotifyUserIds,
        },
      });

      return NextResponse.json({
        success: true,
        settings: {
          damageNotifyUserIds: settings.damageNotifyUserIds,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'team-settings:PATCH');
  }
}
