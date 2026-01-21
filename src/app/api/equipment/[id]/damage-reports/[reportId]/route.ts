import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string; reportId: string }>;
}

// PATCH: Mark damage report as resolved (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: equipmentId, reportId } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can resolve damage reports');

    // Verify the damage report exists and belongs to the team's equipment
    const damageReport = await prisma.damageReport.findFirst({
      where: {
        id: reportId,
        equipmentId,
        teamId: claims.team_id,
      },
    });

    if (!damageReport) return notFoundResponse('Damage report');

    // Update damage report to resolved
    const updated = await prisma.damageReport.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      damageReport: {
        id: updated.id,
        status: updated.status,
        resolvedAt: updated.resolvedAt?.toISOString(),
        resolvedBy: updated.resolvedBy,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'damage-reports/[reportId]:PATCH');
  }
}
