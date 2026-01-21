import { NextRequest, NextResponse } from 'next/server';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { getUsageLogsForTeam } from '@/lib/equipment/usage-logger';

// GET: List equipment usage logs for team
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const equipmentId = searchParams.get('equipmentId');

    // Parse date parameters
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

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

    // Get usage logs for team
    const logs = await getUsageLogsForTeam(claims.team_id, {
      startDate,
      endDate,
      equipmentId: equipmentId || undefined,
    });

    // Format response
    const usageLogs = logs.map((log) => ({
      id: log.id,
      equipment: {
        id: log.equipment.id,
        name: log.equipment.name,
        boatClass: log.equipment.boatClass,
      },
      practice: {
        id: log.practice.id,
        name: log.practice.name,
        date: log.practice.date.toISOString().split('T')[0], // YYYY-MM-DD format
      },
      usageDate: log.usageDate.toISOString(),
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({ usageLogs });
  } catch (error) {
    return serverErrorResponse(error, 'equipment-usage:GET');
  }
}
