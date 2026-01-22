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
    SCHEDULED: isNext ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white',
    SCRATCHED: 'border-gray-300 bg-gray-100 opacity-60',
    COMPLETED: 'border-green-500 bg-green-50',
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
            <span className="text-lg font-semibold">{timeStr}</span>
            {entry.heat && (
              <span className="text-sm text-gray-500">- {entry.heat}</span>
            )}
            {entry.lane && (
              <span className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                Lane {entry.lane}
              </span>
            )}
          </div>

          <h3
            className={`text-base font-medium mt-1 ${
              entry.status === 'SCRATCHED' ? 'line-through text-gray-400' : ''
            }`}
          >
            {entry.eventName}
          </h3>

          {entry.meetingLocation && (
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
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
            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
              <Users className="h-4 w-4" />
              <span>
                {entry.entryLineup.boat?.name || 'No boat'}
                {lineupSummary && `: ${lineupSummary}`}
              </span>
            </div>
          )}

          {entry.notes && (
            <p className="text-sm text-gray-500 mt-2 italic">{entry.notes}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {entry.status === 'COMPLETED' && entry.placement && (
            <span className="text-lg font-bold text-green-600">
              #{entry.placement}
            </span>
          )}

          {entry.notificationConfig && !entry.notificationConfig.notificationSent && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="h-3 w-3" />
              <span>{entry.notificationConfig.leadTimeMinutes}min</span>
            </div>
          )}

          {!entry.entryLineup && entry.status === 'SCHEDULED' && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>No lineup</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
