import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { getUsageLogsForEquipment } from '@/lib/equipment/usage-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get usage history for specific equipment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: equipmentId } = await params;
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Verify equipment exists and belongs to team
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        teamId: claims.team_id,
      },
    });

    if (!equipment) return notFoundResponse('Equipment');

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');

    // Parse parameters
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Validate dates if provided
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate parameter' },
        { status: 400 }
      );
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endDate parameter' },
        { status: 400 }
      );
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be 1-500)' },
        { status: 400 }
      );
    }

    // Get usage logs
    const logs = await getUsageLogsForEquipment(equipmentId, {
      startDate,
      endDate,
      limit,
    });

    // Calculate summary statistics
    const totalUses = logs.length;
    const lastUsed = logs.length > 0 ? logs[0].usageDate : null;

    // Format response
    const usageLogs = logs.map((log) => ({
      id: log.id,
      practice: {
        id: log.practice.id,
        name: log.practice.name,
        date: log.practice.date.toISOString().split('T')[0], // YYYY-MM-DD format
      },
      usageDate: log.usageDate.toISOString(),
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      summary: {
        totalUses,
        lastUsed: lastUsed ? lastUsed.toISOString() : null,
      },
      usageLogs,
    });
  } catch (error) {
    return serverErrorResponse(error, 'equipment/[id]/usage:GET');
  }
}
