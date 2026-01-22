'use client';

import { formatInTimeZone } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';
import { EntryCard } from './entry-card';

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

interface RaceTimelineProps {
  entries: Entry[];
  timezone: string;
  onEntryClick?: (entry: Entry) => void;
}

export function RaceTimeline({ entries, timezone, onEntryClick }: RaceTimelineProps) {
  // Sort by scheduled time
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );

  // Group by date
  const groupedByDate = sortedEntries.reduce((acc, entry) => {
    const date = format(parseISO(entry.scheduledTime), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, Entry[]>);

  // Find the next upcoming entry
  const now = new Date();
  const nextEntry = sortedEntries.find(
    (e) => e.status === 'SCHEDULED' && new Date(e.scheduledTime) > now
  );

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>No entries scheduled</p>
        <p className="text-sm mt-2">Add entries to see the race timeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedByDate).map(([date, dayEntries]) => (
        <div key={date}>
          {/* Date header */}
          <div className="sticky top-0 bg-zinc-900 z-10 py-2 border-b border-zinc-700 mb-4">
            <h3 className="text-lg font-semibold text-zinc-200">
              {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-zinc-500">
              Times shown in {timezone}
            </p>
          </div>

          {/* Entries for this date */}
          <div className="space-y-3">
            {dayEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                timezone={timezone}
                isNext={entry.id === nextEntry?.id}
                onClick={() => onEntryClick?.(entry)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
