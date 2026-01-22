/**
 * Cache manager for regatta and entry data.
 * Provides functions to cache and retrieve regatta data for offline access.
 */

import { db, OfflineRegatta, OfflineEntry } from './schema';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cache a regatta with its entries for offline access.
 */
export async function cacheRegatta(
  regatta: {
    id: string;
    teamId: string;
    name: string;
    location?: string | null;
    venue?: string | null;
    timezone?: string | null;
    startDate: string;
    endDate?: string | null;
    source: 'REGATTA_CENTRAL' | 'MANUAL';
  },
  entries: Array<{
    id: string;
    eventName: string;
    scheduledTime: string;
    meetingLocation?: string | null;
    meetingTime?: string | null;
    notes?: string | null;
    status: 'SCHEDULED' | 'SCRATCHED' | 'COMPLETED';
    heat?: string | null;
    lane?: number | null;
    placement?: number | null;
    entryLineup?: {
      boat?: { id: string; name: string } | null;
      seats: Array<{
        position: number;
        side: 'PORT' | 'STARBOARD' | 'NONE';
        athlete: { id: string; displayName: string | null };
      }>;
    } | null;
    notificationConfig?: {
      leadTimeMinutes: number;
      notificationSent: boolean;
    } | null;
  }>
): Promise<void> {
  const now = Date.now();

  const offlineRegatta: OfflineRegatta = {
    id: regatta.id,
    teamId: regatta.teamId,
    name: regatta.name,
    location: regatta.location || undefined,
    venue: regatta.venue || undefined,
    timezone: regatta.timezone || undefined,
    startDate: regatta.startDate,
    endDate: regatta.endDate || undefined,
    source: regatta.source,
    cachedAt: now,
    syncStatus: 'synced',
  };

  const offlineEntries: OfflineEntry[] = entries.map((e) => ({
    id: e.id,
    regattaId: regatta.id,
    eventName: e.eventName,
    scheduledTime: e.scheduledTime,
    meetingLocation: e.meetingLocation || undefined,
    meetingTime: e.meetingTime || undefined,
    notes: e.notes || undefined,
    status: e.status,
    heat: e.heat || undefined,
    lane: e.lane || undefined,
    placement: e.placement || undefined,
    lineup: e.entryLineup
      ? {
          boatId: e.entryLineup.boat?.id,
          boatName: e.entryLineup.boat?.name,
          seats: e.entryLineup.seats.map((s) => ({
            position: s.position,
            athleteId: s.athlete.id,
            athleteName: s.athlete.displayName || 'Unknown',
            side: s.side,
          })),
        }
      : undefined,
    notificationConfig: e.notificationConfig
      ? {
          leadTimeMinutes: e.notificationConfig.leadTimeMinutes,
          notificationSent: e.notificationConfig.notificationSent,
        }
      : undefined,
    cachedAt: now,
    syncStatus: 'synced',
  }));

  await db.transaction('rw', [db.regattas, db.entries, db.cacheMeta], async () => {
    // Upsert regatta
    await db.regattas.put(offlineRegatta);

    // Delete old entries for this regatta and insert new ones
    await db.entries.where('regattaId').equals(regatta.id).delete();
    await db.entries.bulkPut(offlineEntries);

    // Update cache metadata
    await db.cacheMeta.put({
      key: `regatta:${regatta.id}`,
      lastUpdated: now,
      expiresAt: now + CACHE_TTL_MS,
    });
  });
}

/**
 * Get cached regatta with entries.
 * Returns null if not cached.
 */
export async function getCachedRegatta(regattaId: string): Promise<{
  regatta: OfflineRegatta;
  entries: OfflineEntry[];
  isStale: boolean;
} | null> {
  const regatta = await db.regattas.get(regattaId);
  if (!regatta) return null;

  const entries = await db.entries
    .where('regattaId')
    .equals(regattaId)
    .sortBy('scheduledTime');

  const meta = await db.cacheMeta.get(`regatta:${regattaId}`);
  const isStale = !meta || Date.now() > meta.expiresAt;

  return { regatta, entries, isStale };
}

/**
 * Get all cached regattas for a team.
 */
export async function getCachedRegattas(teamId: string): Promise<{
  regattas: OfflineRegatta[];
  isStale: boolean;
}> {
  const regattas = await db.regattas
    .where('teamId')
    .equals(teamId)
    .sortBy('startDate');

  // Check staleness based on oldest cached regatta
  const oldestCache = regattas.length > 0
    ? Math.min(...regattas.map((r) => r.cachedAt))
    : 0;
  const isStale = oldestCache === 0 || Date.now() - oldestCache > CACHE_TTL_MS;

  return { regattas, isStale };
}

/**
 * Clear cached data for a specific regatta.
 */
export async function clearRegattaCache(regattaId: string): Promise<void> {
  await db.transaction('rw', [db.regattas, db.entries, db.cacheMeta], async () => {
    await db.regattas.delete(regattaId);
    await db.entries.where('regattaId').equals(regattaId).delete();
    await db.cacheMeta.delete(`regatta:${regattaId}`);
  });
}

/**
 * Clear all cached regattas for a team.
 */
export async function clearTeamRegattaCache(teamId: string): Promise<void> {
  const regattas = await db.regattas.where('teamId').equals(teamId).toArray();
  const regattaIds = regattas.map((r) => r.id);

  await db.transaction('rw', [db.regattas, db.entries, db.cacheMeta], async () => {
    await db.regattas.where('teamId').equals(teamId).delete();
    await db.entries.where('regattaId').anyOf(regattaIds).delete();
    for (const id of regattaIds) {
      await db.cacheMeta.delete(`regatta:${id}`);
    }
  });
}

/**
 * Clean up old regatta cache (regattas ended more than 7 days ago).
 */
export async function cleanupOldRegattaCache(): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString();

  const oldRegattas = await db.regattas
    .filter((r) => {
      const endDate = r.endDate || r.startDate;
      return endDate < cutoffDate;
    })
    .toArray();

  if (oldRegattas.length === 0) return 0;

  const regattaIds = oldRegattas.map((r) => r.id);

  await db.transaction('rw', [db.regattas, db.entries, db.cacheMeta], async () => {
    for (const id of regattaIds) {
      await db.regattas.delete(id);
      await db.entries.where('regattaId').equals(id).delete();
      await db.cacheMeta.delete(`regatta:${id}`);
    }
  });

  return oldRegattas.length;
}
