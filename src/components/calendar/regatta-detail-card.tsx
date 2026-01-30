'use client';

import { format, differenceInDays } from 'date-fns';
import { RegistrationBadge } from './registration-badge';
import type { RCPublicRegatta } from '@/lib/regatta-central/types';

interface RegattaDetailCardProps {
  regatta: RCPublicRegatta;
  onClose?: () => void;
}

/**
 * Detailed regatta information card for calendar popup.
 * Shows name, dates, location, and registration status with RC deep link.
 * Blue color scheme differentiates from emerald practices.
 */
export function RegattaDetailCard({ regatta, onClose }: RegattaDetailCardProps) {
  const {
    name,
    startDate,
    endDate,
    location,
    venue,
    status,
    registrationStatus,
    rcUrl,
  } = regatta;

  // Format date display
  const isMultiDay = endDate && differenceInDays(endDate, startDate) > 0;
  const dateDisplay = isMultiDay
    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
    : format(startDate, 'EEEE, MMMM d, yyyy');

  // Status indicator color
  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-blue-500',
    IN_PROGRESS: 'bg-teal-500',
    COMPLETED: 'bg-zinc-500',
    CANCELLED: 'bg-red-500',
  };

  return (
    <div className="bg-zinc-900 border border-blue-500/30 rounded-lg p-4 shadow-xl max-w-sm">
      {/* Header with close button */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Regatta icon */}
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            {status.replace('_', ' ')}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Regatta name */}
      <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
        {name}
      </h3>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
        <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{dateDisplay}</span>
        {isMultiDay && (
          <span className="text-xs text-zinc-500">
            ({differenceInDays(endDate!, startDate) + 1} days)
          </span>
        )}
      </div>

      {/* Location */}
      {(location || venue) && (
        <div className="flex items-start gap-2 text-sm text-zinc-300 mb-3">
          <svg className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            {location && <div>{location}</div>}
            {venue && <div className="text-xs text-zinc-500">{venue}</div>}
          </div>
        </div>
      )}

      {/* Registration status */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Registration:</span>
          <RegistrationBadge status={registrationStatus} />
        </div>
        <a
          href={rcUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View on RC
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
