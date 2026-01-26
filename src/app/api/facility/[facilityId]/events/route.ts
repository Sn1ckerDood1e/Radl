import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

const createEventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  clubIds: z.array(z.string().uuid()).min(1, 'Select at least one club'),
  notes: z.string().max(1000).optional(),
});

interface RouteContext {
  params: Promise<{ facilityId: string }>;
}

// GET /api/facility/[facilityId]/events - List events created by facility
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { facilityId } = await context.params;

    const { user, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Verify FACILITY_ADMIN role
    const membership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!membership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    // Get practices created by this facility (via metadata)
    // We store facilityEventId in notes as JSON for tracking
    const facilityPractices = await prisma.practice.findMany({
      where: {
        notes: { contains: '"facilityEventId":' },
        team: { facilityId },
      },
      include: {
        team: { select: { id: true, name: true, slug: true } },
        season: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Group by facilityEventId
    const eventsMap = new Map<string, {
      id: string;
      name: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      clubs: { id: string; name: string; practiceId: string }[];
    }>();

    for (const practice of facilityPractices) {
      try {
        const metadata = JSON.parse(practice.notes || '{}');
        if (metadata.facilityEventId) {
          const existing = eventsMap.get(metadata.facilityEventId);
          if (existing) {
            existing.clubs.push({
              id: practice.team.id,
              name: practice.team.name,
              practiceId: practice.id,
            });
          } else {
            eventsMap.set(metadata.facilityEventId, {
              id: metadata.facilityEventId,
              name: practice.name,
              date: practice.date,
              startTime: practice.startTime,
              endTime: practice.endTime,
              clubs: [{
                id: practice.team.id,
                name: practice.team.name,
                practiceId: practice.id,
              }],
            });
          }
        }
      } catch {
        // Skip practices with invalid notes JSON
      }
    }

    const events = Array.from(eventsMap.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return NextResponse.json({ events });
  } catch (err) {
    return serverErrorResponse(err, 'facility-events:GET');
  }
}

// POST /api/facility/[facilityId]/events - Create event for multiple clubs
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { facilityId } = await context.params;

    const { user, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Verify FACILITY_ADMIN role
    const membership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!membership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    // Verify facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Parse and validate body
    const body = await request.json();
    const validation = createEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, date, startTime, endTime, clubIds, notes } = validation.data;

    // Verify all clubs belong to this facility
    const clubs = await prisma.team.findMany({
      where: {
        id: { in: clubIds },
        facilityId,
      },
      include: {
        seasons: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (clubs.length !== clubIds.length) {
      return NextResponse.json(
        { error: 'Some clubs not found or not in this facility' },
        { status: 400 }
      );
    }

    // Generate unique facility event ID for tracking
    const facilityEventId = crypto.randomUUID();

    // Create practice for each club in transaction
    const practices = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const club of clubs) {
        // Get or create a season for the club
        let season = club.seasons[0];
        if (!season) {
          season = await tx.season.create({
            data: {
              teamId: club.id,
              name: `${new Date().getFullYear()} Season`,
              status: 'ACTIVE',
            },
          });
        }

        // Create practice with metadata tracking
        const metadata = {
          facilityEventId,
          createdByFacilityId: facilityId,
          originalNotes: notes,
        };

        const practice = await tx.practice.create({
          data: {
            teamId: club.id,
            seasonId: season.id,
            name,
            date: new Date(date),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            status: 'PUBLISHED', // Facility events are published immediately
            notes: JSON.stringify(metadata),
          },
        });

        created.push({
          practiceId: practice.id,
          clubId: club.id,
          clubName: club.name,
        });
      }

      return created;
    });

    return NextResponse.json({
      facilityEventId,
      practices,
    }, { status: 201 });
  } catch (err) {
    return serverErrorResponse(err, 'facility-events:POST');
  }
}
