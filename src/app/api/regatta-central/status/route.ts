import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

// GET: Check RC connection status
export async function GET() {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const connection = await prisma.regattaCentralConnection.findUnique({
      where: { teamId: claims.team_id },
      select: {
        rcClubId: true,
        expiresAt: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      rcClubId: connection.rcClubId,
      lastSyncAt: connection.lastSyncAt,
      tokenExpiresAt: connection.expiresAt,
      connectedAt: connection.createdAt,
    });
  } catch (error) {
    return serverErrorResponse(error, 'regatta-central/status:GET');
  }
}
