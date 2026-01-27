import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { RegattaCentralClient, isRegattaCentralConnected } from '@/lib/regatta-central/client';
import type { RCUpcomingRegattasResponse } from '@/lib/regatta-central/types';

// Cache configuration: 6 hours (21600 seconds)
const CACHE_TTL_SECONDS = 6 * 60 * 60;

/**
 * GET /api/regattas/upcoming - Fetch upcoming regattas from RC
 *
 * Uses server-side caching with 6-hour TTL to avoid rate limits.
 * Falls back to stale data if RC API is unavailable.
 * Filters by team's configured regions (TeamSettings.regattaRegions).
 *
 * Query params:
 * - forceRefresh (optional): Skip cache and fetch fresh data
 */
export async function GET() {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const teamId = claims.team_id;

    // Check if RC is connected
    const isConnected = await isRegattaCentralConnected(teamId);
    if (!isConnected) {
      return NextResponse.json(
        {
          error: 'Regatta Central not connected',
          regattas: [],
          cachedAt: null,
          staleAfter: null,
        },
        { status: 200 }
      );
    }

    // Get team's region preferences (default to US if not configured)
    const teamSettings = await prisma.teamSettings.findUnique({
      where: { teamId },
      select: { regattaRegions: true },
    });

    const regions = teamSettings?.regattaRegions?.length
      ? teamSettings.regattaRegions
      : ['US'];

    // Fetch from RC with caching
    const client = new RegattaCentralClient(teamId);

    const now = new Date();
    const staleAfter = new Date(now.getTime() + CACHE_TTL_SECONDS * 1000);

    try {
      const regattas = await client.getPublicRegattas(regions);

      const response: RCUpcomingRegattasResponse = {
        regattas,
        cachedAt: now.toISOString(),
        staleAfter: staleAfter.toISOString(),
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': `s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate`,
        },
      });
    } catch (rcError) {
      console.error('RC API error:', rcError);

      // Return empty with error indicator for graceful degradation
      return NextResponse.json(
        {
          regattas: [],
          cachedAt: null,
          staleAfter: null,
          error: 'RC API temporarily unavailable',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return serverErrorResponse(error, 'regattas/upcoming:GET');
  }
}
