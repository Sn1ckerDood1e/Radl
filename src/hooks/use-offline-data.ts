'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOfflineSchedules, useCacheFreshness } from '@/lib/db/hooks';
import { cacheSchedules } from '@/lib/db/cache-manager';
import type { OfflineSchedule } from '@/lib/db/schema';

interface UseScheduleWithOfflineOptions {
  teamId: string | undefined;
  onlineEndpoint: string;
}

interface UseScheduleWithOfflineResult {
  schedules: OfflineSchedule[];
  isLoading: boolean;
  isOffline: boolean;
  lastUpdated: Date | null;
  isStale: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook that fetches schedules online and falls back to offline cache
 * Automatically caches API responses for offline use
 */
export function useScheduleWithOffline({
  teamId,
  onlineEndpoint,
}: UseScheduleWithOfflineOptions): UseScheduleWithOfflineResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Reactive offline data
  const offlineSchedules = useOfflineSchedules(teamId);
  const { isStale, lastUpdated } = useCacheFreshness(
    teamId ? `schedules:${teamId}` : '',
    24 * 60 * 60 * 1000 // 24 hour stale threshold
  );

  const fetchAndCache = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(onlineEndpoint);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

      // Transform events to practice format for caching
      // The API returns ScheduleEvent format, we need to transform for caching
      const practices = (data.events || [])
        .filter((e: { type: string }) => e.type === 'practice')
        .map((e: {
          id: string;
          name: string;
          date: string;
          startTime: string;
          endTime?: string;
          status?: 'DRAFT' | 'PUBLISHED';
        }) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime || e.startTime,
          status: e.status || 'PUBLISHED',
          seasonId: '', // Not available in schedule API response
        }));

      // Cache the response
      await cacheSchedules(teamId, practices);

      setIsOffline(false);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);

      // Check if we're offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        // Don't set error - we'll show cached data
      } else {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [teamId, onlineEndpoint]);

  // Initial fetch
  useEffect(() => {
    fetchAndCache();
  }, [fetchAndCache]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchAndCache(); // Refresh when back online
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchAndCache]);

  return {
    schedules: offlineSchedules || [],
    isLoading: isLoading && offlineSchedules.length === 0,
    isOffline,
    lastUpdated,
    isStale,
    error: !isOffline ? error : null, // Don't show error if offline with cache
    refresh: fetchAndCache,
  };
}
