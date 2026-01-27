// ============================================================================
// Dashboard Aggregation Utilities
// ============================================================================
// Functions for aggregating data into formats suitable for dashboard widgets,
// particularly for sparkline visualization of equipment usage trends.

import { eachWeekOfInterval, isWithinInterval } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

/**
 * Weekly aggregated usage data for a date range
 */
export interface WeeklyUsage {
  /** Start date of the week (Sunday) */
  weekStart: Date;
  /** Total usage minutes for this week */
  totalMinutes: number;
}

/**
 * Usage log entry with practice timing information.
 * Matches the shape returned by getUsageLogsForTeam with practice include.
 */
export interface UsageLogWithPractice {
  usageDate: Date;
  practice: {
    startTime: Date;
    endTime: Date;
  };
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Aggregates equipment usage logs into weekly buckets.
 *
 * For each week in the date range, sums the practice durations (computed from
 * startTime and endTime) for all usage logs that fall within that week.
 *
 * @param usageLogs - Array of usage logs with practice timing info
 * @param seasonStart - Start of the date range (typically season start)
 * @param seasonEnd - End of the date range (typically season end or today)
 * @returns Array of weekly usage aggregations ordered by week
 *
 * @example
 * const logs = [
 *   { usageDate: new Date('2026-01-06'), practice: { startTime: ..., endTime: ... } },
 *   { usageDate: new Date('2026-01-08'), practice: { startTime: ..., endTime: ... } },
 * ];
 * const weekly = aggregateUsageByWeek(logs, new Date('2026-01-01'), new Date('2026-01-31'));
 * // Returns: [{ weekStart: ..., totalMinutes: ... }, ...]
 */
export function aggregateUsageByWeek(
  usageLogs: UsageLogWithPractice[],
  seasonStart: Date,
  seasonEnd: Date
): WeeklyUsage[] {
  // Handle edge case: empty logs or invalid date range
  if (seasonEnd <= seasonStart) {
    return [];
  }

  // Generate all weeks in the season range
  // eachWeekOfInterval returns the start of each week (Sunday by default)
  const weeks = eachWeekOfInterval({
    start: seasonStart,
    end: seasonEnd,
  });

  return weeks.map((weekStart) => {
    // Calculate week end (7 days from start)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Sum practice durations for logs within this week
    const totalMinutes = usageLogs
      .filter((log) => {
        // Ensure usageDate is a Date object (might be string from JSON)
        const logDate = new Date(log.usageDate);
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, log) => {
        // Ensure times are Date objects
        const startTime = new Date(log.practice.startTime);
        const endTime = new Date(log.practice.endTime);
        // Calculate duration in minutes
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.max(0, durationMs / 60000); // Prevent negative durations
        return sum + durationMinutes;
      }, 0);

    return {
      weekStart,
      totalMinutes: Math.round(totalMinutes), // Round to whole minutes
    };
  });
}

/**
 * Converts weekly usage aggregation to simple number array for sparkline.
 *
 * @param weeklyUsage - Array of weekly usage data from aggregateUsageByWeek
 * @returns Array of total minutes per week (just the values, no dates)
 *
 * @example
 * const weekly = [{ weekStart: ..., totalMinutes: 120 }, { weekStart: ..., totalMinutes: 90 }];
 * const data = usageToSparklineData(weekly);
 * // Returns: [120, 90]
 */
export function usageToSparklineData(weeklyUsage: WeeklyUsage[]): number[] {
  return weeklyUsage.map((w) => w.totalMinutes);
}
