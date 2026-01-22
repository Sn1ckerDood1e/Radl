import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { RegattaCentralClient } from '@/lib/regatta-central/client';
import { z } from 'zod';

const importSchema = z.object({
  rcRegattaId: z.string().min(1, 'Regatta ID required'),
  seasonId: z.string().uuid(),
});

// POST: Import regatta and entries from Regatta Central
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can import regattas');

    const body = await request.json();
    const validationResult = importSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { rcRegattaId, seasonId } = validationResult.data;

    // Verify season belongs to team
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId: claims.team_id },
    });

    if (!season) return notFoundResponse('Season');

    // Initialize RC client
    const client = new RegattaCentralClient(claims.team_id);

    // Fetch regatta details and team entries in parallel
    const [regattaData, entriesData] = await Promise.all([
      client.getRegattaDetails(rcRegattaId),
      client.getTeamEntries(rcRegattaId),
    ]);

    const rcRegatta = regattaData.regatta;

    // Upsert regatta (update if re-importing)
    const regatta = await prisma.regatta.upsert({
      where: {
        teamId_rcRegattaId: {
          teamId: claims.team_id,
          rcRegattaId: rcRegattaId,
        },
      },
      create: {
        teamId: claims.team_id,
        seasonId,
        name: rcRegatta.name,
        location: rcRegatta.location || null,
        startDate: new Date(rcRegatta.startDate),
        endDate: rcRegatta.endDate ? new Date(rcRegatta.endDate) : null,
        source: 'REGATTA_CENTRAL',
        rcRegattaId,
        lastSyncAt: new Date(),
      },
      update: {
        name: rcRegatta.name,
        location: rcRegatta.location || null,
        startDate: new Date(rcRegatta.startDate),
        endDate: rcRegatta.endDate ? new Date(rcRegatta.endDate) : null,
        lastSyncAt: new Date(),
      },
    });

    // Import/update entries
    let importedCount = 0;
    let updatedCount = 0;

    for (const rcEntry of entriesData.entries || []) {
      const existingEntry = await prisma.entry.findFirst({
        where: {
          regattaId: regatta.id,
          rcEntryId: rcEntry.entryId,
        },
      });

      if (existingEntry) {
        // Update existing entry
        await prisma.entry.update({
          where: { id: existingEntry.id },
          data: {
            eventName: rcEntry.eventTitle,
            eventCode: rcEntry.eventCode || null,
            scheduledTime: rcEntry.raceTime ? new Date(rcEntry.raceTime) : existingEntry.scheduledTime,
            heat: rcEntry.heat || null,
            lane: rcEntry.lane || null,
          },
        });
        updatedCount++;
      } else {
        // Create new entry
        await prisma.entry.create({
          data: {
            regattaId: regatta.id,
            eventName: rcEntry.eventTitle,
            eventCode: rcEntry.eventCode || null,
            rcEntryId: rcEntry.entryId,
            scheduledTime: rcEntry.raceTime
              ? new Date(rcEntry.raceTime)
              : new Date(rcRegatta.startDate), // Fallback to regatta start
            heat: rcEntry.heat || null,
            lane: rcEntry.lane || null,
            status: 'SCHEDULED',
          },
        });
        importedCount++;
      }
    }

    // Update connection's lastSyncAt
    await prisma.regattaCentralConnection.update({
      where: { teamId: claims.team_id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      regatta,
      imported: importedCount,
      updated: updatedCount,
      total: entriesData.entries?.length || 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not connected')) {
      return NextResponse.json({ error: 'Regatta Central not connected' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return serverErrorResponse(error, 'regatta-central/import:POST');
  }
}
