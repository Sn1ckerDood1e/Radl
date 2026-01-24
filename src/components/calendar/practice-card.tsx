'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { SwipeableListItem } from '@/components/mobile/swipeable-list-item';

interface PracticeCardProps {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  teamSlug: string;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

/**
 * Minimal practice card for calendar display.
 * Shows time + name only per CONTEXT.md guidelines.
 * Draft practices show with yellow styling.
 */
export function PracticeCard({
  id,
  name,
  startTime,
  endTime,
  status,
  teamSlug,
  onEdit,
  onDelete,
  canEdit = false,
}: PracticeCardProps) {
  const isDraft = status === 'DRAFT';
  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : null;

  // Format time as "6:00 AM" or "6:00 - 8:00 AM"
  const timeDisplay = endDate
    ? `${format(startDate, 'h:mm')} - ${format(endDate, 'h:mm a')}`
    : format(startDate, 'h:mm a');

  return (
    <SwipeableListItem
      onSwipeLeft={onDelete}
      onSwipeRight={onEdit}
      disabled={!canEdit}
    >
      <Link
        href={`/${teamSlug}/practices/${id}`}
        className={`
          block p-3 rounded-lg border transition-colors
          ${isDraft
            ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
          }
        `}
      >
        <div className="flex items-center gap-2">
          {/* Practice icon */}
          <svg
            className={`h-4 w-4 flex-shrink-0 ${isDraft ? 'text-amber-400' : 'text-blue-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium truncate ${isDraft ? 'text-amber-300' : 'text-white'}`}>
              {name}
            </p>
            <p className={`text-xs ${isDraft ? 'text-amber-400/70' : 'text-zinc-400'}`}>
              {timeDisplay}
            </p>
          </div>
          {isDraft && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
              Draft
            </span>
          )}
        </div>
      </Link>
    </SwipeableListItem>
  );
}
