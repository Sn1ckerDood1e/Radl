'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './use-online-status';
import { getCachedRegatta, cacheRegatta } from '@/lib/db/regatta-cache';
import type { OfflineRegatta, OfflineEntry } from '@/lib/db/schema';

interface RegattaData {
  id: string;
  teamId: string;
  name: string;
  location?: string | null;
  venue?: string | null;
  timezone?: string | null;
  startDate: string;
  endDate?: string | null;
  source: 'REGATTA_CENTRAL' | 'MANUAL';
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
  }>;
}

interface UseOfflineRegattaResult {
  data: RegattaData | null;
  isLoading: boolean;
  isOffline: boolean;
  isStale: boolean;
  cachedAt: number | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching regatta data with offline fallback.
 * Caches data in IndexedDB and falls back to cache when offline.
 */
export function useOfflineRegatta(regattaId: string): UseOfflineRegattaResult {
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<RegattaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFromApi = useCallback(async (): Promise<RegattaData | null> => {
    const response = await fetch(`/api/regattas/${regattaId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch regatta');
    }
    const { regatta } = await response.json();
    return {
      id: regatta.id,
      teamId: regatta.teamId,
      name: regatta.name,
      location: regatta.location,
      venue: regatta.venue,
      timezone: regatta.timezone,
      startDate: regatta.startDate,
      endDate: regatta.endDate,
      source: regatta.source,
      entries: regatta.entries.map((e: Record<string, unknown>) => ({
        id: e.id,
        eventName: e.eventName,
        scheduledTime: e.scheduledTime,
        meetingLocation: e.meetingLocation,
        meetingTime: e.meetingTime,
        notes: e.notes,
        status: e.status,
        heat: e.heat,
        lane: e.lane,
        placement: e.placement,
        entryLineup: e.entryLineup,
        notificationConfig: e.notificationConfig,
      })),
    };
  }, [regattaId]);

  const convertCacheToData = useCallback(
    (regatta: OfflineRegatta, entries: OfflineEntry[]): RegattaData => ({
      id: regatta.id,
      teamId: regatta.teamId,
      name: regatta.name,
      location: regatta.location,
      venue: regatta.venue,
      timezone: regatta.timezone,
      startDate: regatta.startDate,
      endDate: regatta.endDate,
      source: regatta.source,
      entries: entries.map((e) => ({
        id: e.id,
        eventName: e.eventName,
        scheduledTime: e.scheduledTime,
        meetingLocation: e.meetingLocation,
        meetingTime: e.meetingTime,
        notes: e.notes,
        status: e.status,
        heat: e.heat,
        lane: e.lane,
        placement: e.placement,
        entryLineup: e.lineup
          ? {
              boat: e.lineup.boatId
                ? { id: e.lineup.boatId, name: e.lineup.boatName || '' }
                : null,
              seats: e.lineup.seats.map((s) => ({
                position: s.position,
                side: s.side,
                athlete: { id: s.athleteId, displayName: s.athleteName },
              })),
            }
          : null,
        notificationConfig: e.notificationConfig,
      })),
    }),
    []
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Try to fetch from API
        try {
          const apiData = await fetchFromApi();
          if (apiData) {
            setData(apiData);
            setIsStale(false);
            setCachedAt(Date.now());

            // Cache for offline use
            await cacheRegatta(
              {
                id: apiData.id,
                teamId: apiData.teamId,
                name: apiData.name,
                location: apiData.location,
                venue: apiData.venue,
                timezone: apiData.timezone,
                startDate: apiData.startDate,
                endDate: apiData.endDate,
                source: apiData.source,
              },
              apiData.entries
            );
          }
        } catch (apiError) {
          // API failed, try cache
          console.warn('API fetch failed, falling back to cache:', apiError);
          const cached = await getCachedRegatta(regattaId);
          if (cached) {
            setData(convertCacheToData(cached.regatta, cached.entries));
            setIsStale(true);
            setCachedAt(cached.regatta.cachedAt);
            setError('Could not refresh data. Showing cached version.');
          } else {
            throw apiError;
          }
        }
      } else {
        // Offline - use cache only
        const cached = await getCachedRegatta(regattaId);
        if (cached) {
          setData(convertCacheToData(cached.regatta, cached.entries));
          setIsStale(cached.isStale);
          setCachedAt(cached.regatta.cachedAt);
        } else {
          setError('No offline data available. Connect to load regatta.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load regatta');
    } finally {
      setIsLoading(false);
    }
  }, [regattaId, isOnline, fetchFromApi, convertCacheToData]);

  // Initial load and refresh on online status change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when coming back online
  useEffect(() => {
    if (isOnline && isStale) {
      loadData();
    }
  }, [isOnline, isStale, loadData]);

  return {
    data,
    isLoading,
    isOffline: !isOnline,
    isStale,
    cachedAt,
    error,
    refresh: loadData,
  };
}
