import { useLiveQuery } from 'dexie-react-hooks';
import { db, OfflineSchedule, OfflineLineup } from './schema';
import { addDays, startOfDay } from 'date-fns';

const CACHE_WINDOW_DAYS = 14; // 2 weeks as per CONTEXT.md

/**
 * Get cached schedules for a team within the next 2 weeks
 * Automatically re-renders when IndexedDB data changes
 */
export function useOfflineSchedules(teamId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!teamId) return [];

      const today = startOfDay(new Date()).toISOString();
      const twoWeeksOut = addDays(new Date(), CACHE_WINDOW_DAYS).toISOString();

      return db.schedules
        .where('teamId')
        .equals(teamId)
        .and((s) => s.date >= today && s.date <= twoWeeksOut)
        .sortBy('date');
    },
    [teamId],
    [] // Default value while loading
  );
}

/**
 * Get cached lineups for a specific practice
 */
export function useOfflineLineups(practiceId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!practiceId) return [];

      return db.lineups
        .where('practiceId')
        .equals(practiceId)
        .sortBy('blockPosition');
    },
    [practiceId],
    []
  );
}

/**
 * Get count of pending sync items
 */
export function useSyncQueueCount() {
  return useLiveQuery(
    () => db.syncQueue.count(),
    [],
    0
  );
}

/**
 * Check if cache is stale (older than threshold)
 * Returns { isStale, lastUpdated } where lastUpdated is a Date or null
 */
export function useCacheFreshness(cacheKey: string, staleThresholdMs = 24 * 60 * 60 * 1000) {
  return useLiveQuery(
    async () => {
      const meta = await db.cacheMeta.get(cacheKey);
      if (!meta) {
        return { isStale: true, lastUpdated: null };
      }

      const isStale = Date.now() - meta.lastUpdated > staleThresholdMs;
      return {
        isStale,
        lastUpdated: new Date(meta.lastUpdated)
      };
    },
    [cacheKey, staleThresholdMs],
    { isStale: true, lastUpdated: null }
  );
}

/**
 * Get a specific schedule by ID from cache
 */
export function useOfflineSchedule(scheduleId: string | undefined) {
  return useLiveQuery(
    () => scheduleId ? db.schedules.get(scheduleId) : undefined,
    [scheduleId],
    undefined
  );
}
