import { db, OfflineSchedule, OfflineLineup, CacheMeta } from './schema';
import { addDays, startOfDay } from 'date-fns';

const CACHE_WINDOW_DAYS = 14;
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cache schedules from API response to IndexedDB
 * Replaces existing cache for the team
 */
export async function cacheSchedules(
  teamId: string,
  practices: Array<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    status: 'DRAFT' | 'PUBLISHED';
    notes?: string;
    seasonId: string;
  }>
): Promise<void> {
  const now = Date.now();

  // Transform to offline format
  const offlineSchedules: OfflineSchedule[] = practices.map((p) => ({
    id: p.id,
    teamId,
    seasonId: p.seasonId,
    name: p.name,
    date: p.date,
    startTime: p.startTime,
    endTime: p.endTime,
    status: p.status,
    notes: p.notes,
    cachedAt: now,
    syncStatus: 'synced' as const,
  }));

  await db.transaction('rw', [db.schedules, db.cacheMeta], async () => {
    // Clear old schedules for this team (within cache window only)
    const today = startOfDay(new Date()).toISOString();
    const windowEnd = addDays(new Date(), CACHE_WINDOW_DAYS).toISOString();

    await db.schedules
      .where('teamId')
      .equals(teamId)
      .and((s) => s.date >= today && s.date <= windowEnd)
      .delete();

    // Insert new schedules
    if (offlineSchedules.length > 0) {
      await db.schedules.bulkPut(offlineSchedules);
    }

    // Update cache metadata
    await updateCacheMeta(`schedules:${teamId}`);
  });
}

/**
 * Cache lineups for a practice to IndexedDB
 */
export async function cacheLineups(
  practiceId: string,
  lineups: Array<{
    id: string;
    blockId: string;
    block: {
      type: 'WATER' | 'LAND' | 'ERG';
      position: number;
    };
    boatId?: string;
    boat?: { name: string };
    seats: Array<{
      position: number;
      athleteId: string;
      athlete: { displayName?: string };
      side: 'PORT' | 'STARBOARD' | 'NONE';
    }>;
  }>
): Promise<void> {
  const now = Date.now();

  const offlineLineups: OfflineLineup[] = lineups.map((l) => ({
    id: l.id,
    practiceId,
    blockId: l.blockId,
    blockType: l.block.type,
    blockPosition: l.block.position,
    boatId: l.boatId,
    boatName: l.boat?.name,
    seats: l.seats.map((s) => ({
      position: s.position,
      athleteId: s.athleteId,
      athleteName: s.athlete.displayName || 'Unknown',
      side: s.side,
    })),
    cachedAt: now,
    syncStatus: 'synced' as const,
  }));

  await db.transaction('rw', [db.lineups, db.cacheMeta], async () => {
    // Clear old lineups for this practice
    await db.lineups.where('practiceId').equals(practiceId).delete();

    // Insert new lineups
    if (offlineLineups.length > 0) {
      await db.lineups.bulkPut(offlineLineups);
    }

    // Update cache metadata
    await updateCacheMeta(`lineups:${practiceId}`);
  });
}

/**
 * Update cache metadata timestamp
 */
export async function updateCacheMeta(
  key: string,
  ttlMs: number = DEFAULT_CACHE_TTL
): Promise<void> {
  const now = Date.now();
  await db.cacheMeta.put({
    key,
    lastUpdated: now,
    expiresAt: now + ttlMs,
  });
}

/**
 * Get cache metadata
 */
export async function getCacheMeta(key: string): Promise<CacheMeta | undefined> {
  return db.cacheMeta.get(key);
}

/**
 * Check if cache is expired
 */
export async function isCacheExpired(key: string): Promise<boolean> {
  const meta = await getCacheMeta(key);
  if (!meta) return true;
  return Date.now() > meta.expiresAt;
}

/**
 * Clear all cached data for a team (useful for logout)
 */
export async function clearTeamCache(teamId: string): Promise<void> {
  await db.transaction('rw', [db.schedules, db.lineups, db.cacheMeta], async () => {
    await db.schedules.where('teamId').equals(teamId).delete();
    // Note: lineups are keyed by practiceId, so we'd need practice IDs to clear
    // For now, clear all lineups (acceptable on logout)
    await db.lineups.clear();
    // Clear relevant cache meta
    await db.cacheMeta.where('key').startsWith(`schedules:${teamId}`).delete();
  });
}
