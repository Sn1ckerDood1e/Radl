'use client';

import { formatInTimeZone } from 'date-fns-tz';
import { Clock, MapPin, Users, AlertCircle } from 'lucide-react';

interface EntryCardProps {
  entry: {
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
  };
  timezone: string;
  isNext?: boolean;
  onClick?: () => void;
}

export function EntryCard({ entry, timezone, isNext, onClick }: EntryCardProps) {
  const timeStr = formatInTimeZone(
    new Date(entry.scheduledTime),
    timezone,
    'h:mm a'
  );

  const statusColors = {
    SCHEDULED: isNext ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 bg-zinc-800',
    SCRATCHED: 'border-zinc-600 bg-zinc-800/50 opacity-60',
    COMPLETED: 'border-teal-500 bg-teal-500/10',
  };

  const lineupSummary = entry.entryLineup?.seats
    ?.map((s) => s.athlete.displayName || 'Unknown')
    .join(', ');

  return (
    <div
      onClick={onClick}
      className={`border-l-4 rounded-r-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${statusColors[entry.status]}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">{timeStr}</span>
            {entry.heat && (
              <span className="text-sm text-zinc-400">- {entry.heat}</span>
            )}
            {entry.lane && (
              <span className="text-sm bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                Lane {entry.lane}
              </span>
            )}
          </div>

          <h3
            className={`text-base font-medium mt-1 ${
              entry.status === 'SCRATCHED' ? 'line-through text-zinc-500' : 'text-zinc-200'
            }`}
          >
            {entry.eventName}
          </h3>

          {entry.meetingLocation && (
            <div className="flex items-center gap-1 text-sm text-zinc-400 mt-2">
              <MapPin className="h-4 w-4" />
              <span>Meet: {entry.meetingLocation}</span>
              {entry.meetingTime && (
                <span className="ml-2">
                  at {formatInTimeZone(new Date(entry.meetingTime), timezone, 'h:mm a')}
                </span>
              )}
            </div>
          )}

          {entry.entryLineup && (
            <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
              <Users className="h-4 w-4" />
              <span>
                {entry.entryLineup.boat?.name || 'No boat'}
                {lineupSummary && `: ${lineupSummary}`}
              </span>
            </div>
          )}

          {entry.notes && (
            <p className="text-sm text-zinc-500 mt-2 italic">{entry.notes}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {entry.status === 'COMPLETED' && entry.placement && (
            <span className="text-lg font-bold text-teal-400">
              #{entry.placement}
            </span>
          )}

          {entry.notificationConfig && !entry.notificationConfig.notificationSent && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <Clock className="h-3 w-3" />
              <span>{entry.notificationConfig.leadTimeMinutes}min</span>
            </div>
          )}

          {!entry.entryLineup && entry.status === 'SCHEDULED' && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle className="h-3 w-3" />
              <span>No lineup</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
