'use client';

import { format } from 'date-fns';

interface RegattaCardProps {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  location?: string;
}

/**
 * Regatta placeholder card for calendar display.
 * Emerald styling to distinguish from practices.
 * No link yet - Phase 5 builds full regatta features.
 */
export function RegattaCard({
  id,
  name,
  startTime,
  endTime,
  location,
}: RegattaCardProps) {
  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : null;

  // Show single date or date range
  const dateDisplay = endDate && endDate.toDateString() !== startDate.toDateString()
    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
    : format(startDate, 'MMM d');

  return (
    <div
      className="block p-3 rounded-lg border bg-teal-500/10 border-teal-500/30"
    >
      <div className="flex items-center gap-2">
        {/* Regatta icon (trophy/flag) */}
        <svg
          className="h-4 w-4 flex-shrink-0 text-teal-400"
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
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-teal-300 truncate">
            {name}
          </p>
          <p className="text-xs text-teal-400/70">
            {dateDisplay}
            {location && ` • ${location}`}
          </p>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-500/20 text-teal-400">
          Regatta
        </span>
      </div>
    </div>
  );
}
