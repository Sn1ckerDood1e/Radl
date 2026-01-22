import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

// GET: Check auto-sync status
export async function GET() {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const connection = await prisma.regattaCentralConnection.findUnique({
      where: { teamId: claims.team_id },
      select: {
        autoSyncEnabled: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        autoSyncEnabled: false,
      });
    }

    return NextResponse.json({
      connected: true,
      autoSyncEnabled: connection.autoSyncEnabled,
    });
  } catch (error) {
    return serverErrorResponse(error, 'regatta-central/auto-sync:GET');
  }
}

// PATCH: Toggle auto-sync setting
const patchSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can modify auto-sync settings');

    const body = await req.json();
    const validation = patchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { enabled } = validation.data;

    // Check if connection exists
    const connection = await prisma.regattaCentralConnection.findUnique({
      where: { teamId: claims.team_id },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Regatta Central connection found' },
        { status: 404 }
      );
    }

    // Update auto-sync setting
    await prisma.regattaCentralConnection.update({
      where: { teamId: claims.team_id },
      data: { autoSyncEnabled: enabled },
    });

    return NextResponse.json({
      success: true,
      autoSyncEnabled: enabled,
    });
  } catch (error) {
    return serverErrorResponse(error, 'regatta-central/auto-sync:PATCH');
  }
}
