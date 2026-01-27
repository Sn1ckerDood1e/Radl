// ============================================================================
// Dashboard Data Fetching Functions
// ============================================================================
// Centralized queries that aggregate data for dashboard widgets.
// These functions are called from the page server component.

import { prisma } from '@/lib/prisma';
import {
  calculateReadinessStatus,
  DEFAULT_READINESS_THRESHOLDS,
  type ReadinessThresholds,
} from '@/lib/equipment/readiness';
import { getUsageLogsForTeam } from '@/lib/equipment/usage-logger';
import { aggregateUsageByWeek, usageToSparklineData } from './aggregations';

// ============================================================================
// Types
// ============================================================================

/**
 * Practice data for today's practices widget
 */
export interface TodaysPracticeData {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  athleteCount: number;
  blockCount: number;
}

/**
 * Result from getTodaysPracticesForCoach
 */
export interface TodaysPracticesResult {
  todaysPractices: TodaysPracticeData[];
  nextPractice: TodaysPracticeData | null;
}

/**
 * Attention item for dashboard alerts
 */
export interface AttentionItem {
  type: 'equipment_inspection' | 'lineup_needed' | 'practice_unpublished';
  count: number;
  label: string;
  href: string;
}

/**
 * Usage trends data for sparkline widget
 */
export interface UsageTrendsData {
  sparklineData: number[];
  totalHours: number;
  seasonName?: string;
}

/**
 * Athlete's next practice with assignment details
 */
export interface AthleteNextPracticeData {
  practice: {
    id: string;
    name: string;
    date: Date;
    startTime: Date;
    endTime: Date;
  } | null;
  assignment: {
    blockType: 'WATER' | 'ERG' | 'LAND' | 'MEETING';
    boatName?: string;
    boatClass?: string;
    seatPosition?: number;
    seatSide?: 'PORT' | 'STARBOARD' | null;
    groupName?: string;
  } | null;
  unassignedPracticeCount: number;
}

// ============================================================================
// Coach Dashboard Queries
// ============================================================================

/**
 * Get today's practices for the coach dashboard.
 *
 * Uses date string comparison (YYYY-MM-DD) to avoid timezone issues.
 * If no practices today, also returns the next future practice.
 *
 * @param teamId - Team ID to fetch practices for
 * @returns Today's practices with athlete counts, plus next practice if none today
 */
export async function getTodaysPracticesForCoach(
  teamId: string
): Promise<TodaysPracticesResult> {
  // Use date string comparison to avoid timezone issues (RESEARCH.md pitfall #1)
  const todayString = new Date().toISOString().split('T')[0];

  // Query today's practices with blocks and athlete counts
  const practices = await prisma.practice.findMany({
    where: {
      teamId,
      date: {
        gte: new Date(`${todayString}T00:00:00.000Z`),
        lt: new Date(`${todayString}T23:59:59.999Z`),
      },
    },
    include: {
      blocks: {
        include: {
          lineup: {
            include: {
              seats: true,
            },
          },
          landAssignments: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  // Transform to TodaysPracticeData format
  const todaysPractices: TodaysPracticeData[] = practices.map((practice) => {
    // Compute unique athlete count across all blocks
    const athleteIds = new Set<string>();

    for (const block of practice.blocks) {
      // Water blocks: athletes from lineup seats
      for (const lineup of block.lineup) {
        for (const seat of lineup.seats) {
          athleteIds.add(seat.athleteId);
        }
      }
      // Land/Erg blocks: athletes from land assignments
      for (const assignment of block.landAssignments) {
        athleteIds.add(assignment.athleteId);
      }
    }

    return {
      id: practice.id,
      name: practice.name,
      startTime: practice.startTime,
      endTime: practice.endTime,
      athleteCount: athleteIds.size,
      blockCount: practice.blocks.length,
    };
  });

  // If no practices today, get next future practice
  let nextPractice: TodaysPracticeData | null = null;

  if (todaysPractices.length === 0) {
    const futureDate = new Date(`${todayString}T23:59:59.999Z`);

    const nextPracticeRecord = await prisma.practice.findFirst({
      where: {
        teamId,
        date: {
          gt: futureDate,
        },
      },
      include: {
        blocks: {
          include: {
            lineup: {
              include: {
                seats: true,
              },
            },
            landAssignments: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (nextPracticeRecord) {
      const athleteIds = new Set<string>();

      for (const block of nextPracticeRecord.blocks) {
        for (const lineup of block.lineup) {
          for (const seat of lineup.seats) {
            athleteIds.add(seat.athleteId);
          }
        }
        for (const assignment of block.landAssignments) {
          athleteIds.add(assignment.athleteId);
        }
      }

      nextPractice = {
        id: nextPracticeRecord.id,
        name: nextPracticeRecord.name,
        startTime: nextPracticeRecord.startTime,
        endTime: nextPracticeRecord.endTime,
        athleteCount: athleteIds.size,
        blockCount: nextPracticeRecord.blocks.length,
      };
    }
  }

  return {
    todaysPractices,
    nextPractice,
  };
}

/**
 * Get attention items for coach dashboard.
 *
 * Returns equipment needing inspection and practices needing lineups.
 *
 * @param teamId - Team ID
 * @param teamSlug - Team slug for building href links
 * @returns Array of attention items with counts and links
 */
export async function getAttentionItems(
  teamId: string,
  teamSlug: string
): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  // Get team settings for readiness thresholds
  const teamSettings = await prisma.teamSettings.findUnique({
    where: { teamId },
    select: {
      readinessInspectSoonDays: true,
      readinessNeedsAttentionDays: true,
      readinessOutOfServiceDays: true,
    },
  });

  const thresholds: ReadinessThresholds = teamSettings
    ? {
        inspectSoonDays: teamSettings.readinessInspectSoonDays,
        needsAttentionDays: teamSettings.readinessNeedsAttentionDays,
        outOfServiceDays: teamSettings.readinessOutOfServiceDays,
      }
    : DEFAULT_READINESS_THRESHOLDS;

  // Query equipment with damage reports for readiness calculation
  const equipment = await prisma.equipment.findMany({
    where: {
      teamId,
      status: 'ACTIVE',
    },
    include: {
      damageReports: {
        where: {
          status: 'OPEN',
        },
        select: {
          id: true,
          severity: true,
          status: true,
          location: true,
        },
      },
    },
  });

  // Count equipment needing inspection (NEEDS_ATTENTION or OUT_OF_SERVICE due to inspection)
  let inspectionNeededCount = 0;

  for (const item of equipment) {
    const readiness = calculateReadinessStatus(
      {
        manualUnavailable: item.manualUnavailable,
        manualUnavailableNote: item.manualUnavailableNote,
        lastInspectedAt: item.lastInspectedAt,
        damageReports: item.damageReports,
      },
      thresholds
    );

    // Count equipment that needs attention or is out of service
    if (
      readiness.status === 'OUT_OF_SERVICE' ||
      readiness.status === 'NEEDS_ATTENTION'
    ) {
      inspectionNeededCount++;
    }
  }

  if (inspectionNeededCount > 0) {
    items.push({
      type: 'equipment_inspection',
      count: inspectionNeededCount,
      label:
        inspectionNeededCount === 1
          ? '1 piece of equipment needs attention'
          : `${inspectionNeededCount} pieces of equipment need attention`,
      href: `/${teamSlug}/equipment?filter=needs-attention`,
    });
  }

  // Query practices in next 14 days with WATER blocks having no lineups
  const today = new Date();
  const fourteenDaysLater = new Date();
  fourteenDaysLater.setDate(fourteenDaysLater.getDate() + 14);

  const practicesNeedingLineups = await prisma.practice.findMany({
    where: {
      teamId,
      date: {
        gte: today,
        lte: fourteenDaysLater,
      },
      status: 'PUBLISHED',
      blocks: {
        some: {
          type: 'WATER',
          lineup: {
            none: {},
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (practicesNeedingLineups.length > 0) {
    items.push({
      type: 'lineup_needed',
      count: practicesNeedingLineups.length,
      label:
        practicesNeedingLineups.length === 1
          ? '1 practice needs lineups'
          : `${practicesNeedingLineups.length} practices need lineups`,
      href: `/${teamSlug}/practices?filter=needs-lineup`,
    });
  }

  return items;
}

/**
 * Get usage trends data for the coach dashboard sparkline widget.
 *
 * Finds the active season, aggregates usage by week, and returns sparkline data.
 *
 * @param teamId - Team ID
 * @returns Sparkline data array, total hours, and season name
 */
export async function getUsageTrendsData(
  teamId: string
): Promise<UsageTrendsData> {
  // Find active season (most recent by startDate)
  const activeSeason = await prisma.season.findFirst({
    where: {
      teamId,
      status: 'ACTIVE',
    },
    orderBy: {
      startDate: 'desc',
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!activeSeason || !activeSeason.startDate) {
    return {
      sparklineData: [],
      totalHours: 0,
      seasonName: undefined,
    };
  }

  // Use today if no end date set
  const seasonStart = activeSeason.startDate;
  const seasonEnd = activeSeason.endDate || new Date();

  // Get usage logs within season date range
  const usageLogs = await getUsageLogsForTeam(teamId, {
    startDate: seasonStart,
    endDate: seasonEnd,
  });

  // Transform to format expected by aggregateUsageByWeek
  const logsWithPractice = usageLogs.map((log) => ({
    usageDate: log.usageDate,
    practice: {
      startTime: log.practice.date, // Use practice date as proxy since we don't have full times
      endTime: log.practice.date,
    },
  }));

  // Aggregate by week
  const weeklyUsage = aggregateUsageByWeek(logsWithPractice, seasonStart, seasonEnd);

  // Convert to sparkline data
  const sparklineData = usageToSparklineData(weeklyUsage);

  // Compute total hours (sum of all weekly minutes / 60)
  const totalMinutes = weeklyUsage.reduce((sum, week) => sum + week.totalMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal

  return {
    sparklineData,
    totalHours,
    seasonName: activeSeason.name,
  };
}
