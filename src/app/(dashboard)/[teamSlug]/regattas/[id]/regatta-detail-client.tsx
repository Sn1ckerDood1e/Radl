'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RaceTimeline } from '@/components/regatta/race-timeline';
import { StalenessIndicator } from '@/components/pwa/staleness-indicator';
import { useOnlineStatus } from '@/hooks/use-online-status';
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
  regatta: {
    id: string;
    name: string;
    timezone: string;
    source: string;
    entries: Entry[];
  };
  athletes: {
    id: string;
    displayName: string | null;
    sidePreference?: string | null;
    canBow: boolean;
    canCox: boolean;
  }[];
  boats: { id: string; name: string; boatClass: string | null }[];
  isCoach: boolean;
  initialCachedAt?: number;
}

export function RegattaDetailClient({
  teamSlug,
  regatta,
  isCoach,
  initialCachedAt,
}: RegattaDetailClientProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedAt] = useState(initialCachedAt);

  // Calculate staleness (24 hours threshold)
  const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
  const isStale = cachedAt ? Date.now() - cachedAt > STALE_THRESHOLD_MS : false;
  const lastUpdated = cachedAt ? new Date(cachedAt) : null;

  function handleEntryClick(entry: Entry) {
    router.push(`/${teamSlug}/regattas/${regatta.id}/entries/${entry.id}`);
  }

  async function handleRefresh() {
    if (!isOnline || isRefreshing) return;
    setIsRefreshing(true);
    try {
      router.refresh();
    } finally {
      // Small delay to show refresh state
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }

  return (
    <div>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-400 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Showing cached data.</span>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Race Schedule</h2>
          <StalenessIndicator
            lastUpdated={lastUpdated}
            isStale={isStale}
            isOffline={!isOnline}
          />
        </div>
        <div className="flex gap-2">
          {isOnline && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          {isCoach && isOnline && (
            <button
              onClick={() => router.push(`/${teamSlug}/regattas/${regatta.id}/entries/new`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
          )}
          {isCoach && (
            <button
              onClick={() => router.push(`/${teamSlug}/regattas/${regatta.id}/edit`)}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 text-sm"
            >
              <Settings className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <RaceTimeline
          entries={regatta.entries}
          timezone={regatta.timezone}
          onEntryClick={handleEntryClick}
        />
      </div>
    </div>
  );
}
