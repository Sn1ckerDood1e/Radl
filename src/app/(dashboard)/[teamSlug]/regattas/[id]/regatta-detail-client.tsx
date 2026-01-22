'use client';

import { useRouter } from 'next/navigation';
import { RaceTimeline } from '@/components/regatta/race-timeline';
import { Plus, Settings } from 'lucide-react';

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
}

export function RegattaDetailClient({
  teamSlug,
  regatta,
  isCoach,
}: RegattaDetailClientProps) {
  const router = useRouter();

  function handleEntryClick(entry: Entry) {
    router.push(`/${teamSlug}/regattas/${regatta.id}/entries/${entry.id}`);
  }

  return (
    <div>
      {/* Actions bar */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">Race Schedule</h2>
        {isCoach && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/${teamSlug}/regattas/${regatta.id}/entries/new`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </button>
            <button
              onClick={() => router.push(`/${teamSlug}/regattas/${regatta.id}/edit`)}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 text-sm"
            >
              <Settings className="h-4 w-4" />
              Edit
            </button>
          </div>
        )}
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
