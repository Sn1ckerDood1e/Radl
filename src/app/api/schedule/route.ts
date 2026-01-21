import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

/**
 * Schedule event type for unified calendar display.
 * Combines practices and regattas into a single format.
 */
export interface ScheduleEvent {
  id: string;
  type: 'practice' | 'regatta';
  name: string;
  date: string; // ISO date string
  startTime: string; // ISO datetime string
  endTime?: string; // ISO datetime string
  status?: 'DRAFT' | 'PUBLISHED'; // practices only
  location?: string; // regattas only
}

/**
 * GET /api/schedule - Unified calendar endpoint
 *
 * Query params:
 * - startDate (required): Start of date range (ISO date string)
 * - endDate (required): End of date range (ISO date string)
 * - seasonId (optional): Filter by specific season
 *
 * Returns practices and regattas combined.
 * Athletes only see PUBLISHED practices, coaches see all.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const seasonId = searchParams.get('seasonId');

    // Validate required params
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Build practice where clause
    const practiceWhere: {
      teamId: string;
      date: { gte: Date; lte: Date };
      seasonId?: string;
      status?: 'PUBLISHED';
    } = {
      teamId: claims.team_id,
      date: { gte: startDateObj, lte: endDateObj },
    };

    if (seasonId) {
      practiceWhere.seasonId = seasonId;
    }

    // Athletes only see PUBLISHED practices
    if (claims.user_role !== 'COACH') {
      practiceWhere.status = 'PUBLISHED';
    }

    // Build regatta where clause
    const regattaWhere: {
      teamId: string;
      startDate: { gte: Date; lte: Date };
      seasonId?: string;
    } = {
      teamId: claims.team_id,
      startDate: { gte: startDateObj, lte: endDateObj },
    };

    if (seasonId) {
      regattaWhere.seasonId = seasonId;
    }

    // Fetch both in parallel
    const [practices, regattas] = await Promise.all([
      prisma.practice.findMany({
        where: practiceWhere,
        select: {
          id: true,
          name: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.regatta.findMany({
        where: regattaWhere,
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          location: true,
        },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    // Transform to unified ScheduleEvent format
    const events: ScheduleEvent[] = [
      ...practices.map((p) => ({
        id: p.id,
        type: 'practice' as const,
        name: p.name,
        date: p.date.toISOString().split('T')[0], // YYYY-MM-DD
        startTime: p.startTime.toISOString(),
        endTime: p.endTime.toISOString(),
        status: p.status as 'DRAFT' | 'PUBLISHED',
      })),
      ...regattas.map((r) => ({
        id: r.id,
        type: 'regatta' as const,
        name: r.name,
        date: r.startDate.toISOString().split('T')[0], // YYYY-MM-DD
        startTime: r.startDate.toISOString(),
        endTime: r.endDate?.toISOString(),
        location: r.location || undefined,
      })),
    ];

    // Sort combined events by date then startTime
    events.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json({ events });
  } catch (error) {
    return serverErrorResponse(error, 'schedule:GET');
  }
}
