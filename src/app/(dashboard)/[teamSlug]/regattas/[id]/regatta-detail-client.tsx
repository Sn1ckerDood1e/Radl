'use client';

import { useRouter } from 'next/navigation';
import { RaceTimeline } from '@/components/regatta/race-timeline';
import { StalenessIndicator } from '@/components/pwa/staleness-indicator';
import { useOfflineRegatta } from '@/hooks/use-offline-regatta';
import { Plus, Settings, WifiOff, RefreshCw } from 'lucide-react';

interface Entry {
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
    seats: { position: number; athlete: { id: string; displayName: string | null } }[];
  } | null;
  notificationConfig?: {
    leadTimeMinutes: number;
    notificationSent: boolean;
  } | null;
}

interface RegattaDetailClientProps {
  teamSlug: string;
  regattaId: string;
  regattaName: string;
  timezone: string;
  isCoach: boolean;
}

export function RegattaDetailClient({
  teamSlug,
  regattaId,
  regattaName,
  timezone,
  isCoach,
}: RegattaDetailClientProps) {
  const router = useRouter();

  // Use offline-aware hook - fetches from API when online, falls back to IndexedDB cache when offline
  const {
    data: regatta,
    isLoading,
    isOffline,
    isStale,
    cachedAt,
    error,
    refresh,
  } = useOfflineRegatta(regattaId);

  const lastUpdated = cachedAt ? new Date(cachedAt) : null;

  function handleEntryClick(entry: Entry) {
    router.push(`/${teamSlug}/regattas/${regattaId}/entries/${entry.id}`);
  }

  async function handleRefresh() {
    if (isOffline) return;
    await refresh();
  }

  // Loading state
  if (isLoading && !regatta) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  // Error state (no cached data available)
  if (error && !regatta) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>{error}</p>
        {!isOffline && (
          <button onClick={refresh} className="mt-4 text-teal-400 hover:underline">
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Offline indicator */}
      {isOffline && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-400 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Showing cached data.</span>
        </div>
      )}

      {/* Stale data warning (online but showing cached data due to API error) */}
      {error && regatta && !isOffline && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-400 text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Race Schedule</h2>
          <StalenessIndicator
            lastUpdated={lastUpdated}
            isStale={isStale}
            isOffline={isOffline}
          />
        </div>
        <div className="flex gap-2">
          {!isOffline && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          {isCoach && !isOffline && (
            <button
              onClick={() => router.push(`/${teamSlug}/regattas/${regattaId}/entries/new`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-500 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          )}
          {isCoach && (
            <button
              onClick={() => router.push(`/${teamSlug}/regattas/${regattaId}/edit`)}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 text-sm"
            >
              <Settings className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {regatta && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <RaceTimeline
            entries={regatta.entries}
            timezone={timezone}
            onEntryClick={handleEntryClick}
          />
        </div>
      )}

      {/* Empty state when no cached data */}
      {!regatta && !isLoading && !error && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
          <p>No race schedule data available.</p>
          {!isOffline && (
            <button onClick={refresh} className="mt-4 text-teal-400 hover:underline">
              Load schedule
            </button>
          )}
        </div>
      )}
    </div>
  );
}
