'use client';

import { formatDistanceToNow } from 'date-fns';

interface StalenessIndicatorProps {
  lastUpdated: Date | null;
  isStale: boolean;
  isOffline: boolean;
  className?: string;
}

/**
 * Shows cache freshness with "Last updated X ago" and warning for stale data
 * Per CONTEXT.md: subtle indicator, not alarming
 */
export function StalenessIndicator({
  lastUpdated,
  isStale,
  isOffline,
  className = '',
}: StalenessIndicatorProps) {
  if (!lastUpdated && !isOffline) {
    return null;
  }

  const timeAgo = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : 'never';

  return (
    <div className={`text-sm flex items-center gap-2 ${className}`}>
      {isOffline && (
        <span className="inline-flex items-center gap-1 text-amber-500">
          <OfflineIcon className="w-4 h-4" />
          <span>Offline</span>
        </span>
      )}
      {lastUpdated && (
        <span className={`${isStale ? 'text-amber-500' : 'text-zinc-500'}`}>
          {isOffline ? ' - ' : ''}
          Last updated {timeAgo}
          {isStale && !isOffline && (
            <span className="ml-1 text-amber-500" title="Data may be outdated">
              (stale)
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-7.072 0M3 3l3.757 3.757m0 0a9 9 0 0110.486-2.15"
      />
    </svg>
  );
}
