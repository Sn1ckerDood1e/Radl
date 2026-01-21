'use client';

/**
 * Presentational athlete card component for lineup editor
 *
 * IMPORTANT: This is a pure presentation component with NO drag-drop hooks.
 * It's used in multiple contexts:
 * - Roster panel (wrapped by DraggableAthlete)
 * - DragOverlay (rendered directly - hooks would fail here)
 * - Seat slots (showing assigned athlete)
 */

interface AthleteCardProps {
  athlete: {
    id: string;
    displayName: string | null;
    sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
  };
  compact?: boolean; // Smaller variant for seat slots
  isDragging?: boolean; // Visual feedback during drag
}

export function AthleteCard({ athlete, compact = false, isDragging = false }: AthleteCardProps) {
  // Display name with fallback
  const displayName = athlete.displayName || 'Unknown';

  // Get initials for avatar
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Side preference colors
  const sideIndicator = athlete.sidePreference ? {
    PORT: { color: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'P' },
    STARBOARD: { color: 'border-l-green-500', bg: 'bg-green-500/10', text: 'text-green-400', label: 'S' },
    BOTH: { color: 'border-l-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'B' },
  }[athlete.sidePreference] : null;

  if (compact) {
    return (
      <div
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-lg border-l-4
          ${sideIndicator?.color || 'border-l-zinc-700'}
          ${isDragging ? 'opacity-50' : 'bg-zinc-800/80'}
          transition-opacity
        `}
      >
        {/* Compact avatar */}
        <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0">
          {initials}
        </div>

        {/* Name */}
        <span className="text-sm text-white truncate flex-1">{displayName}</span>

        {/* Side badge */}
        {sideIndicator && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${sideIndicator.bg} ${sideIndicator.text} font-medium flex-shrink-0`}>
            {sideIndicator.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-3 py-2 px-3 rounded-lg border-l-4
        ${sideIndicator?.color || 'border-l-zinc-700'}
        ${isDragging ? 'opacity-50 bg-zinc-700/50' : 'bg-zinc-800'}
        transition-all
      `}
    >
      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{displayName}</p>
        {sideIndicator && (
          <p className="text-xs text-zinc-400 mt-0.5">
            {athlete.sidePreference === 'PORT' ? 'Port' : athlete.sidePreference === 'STARBOARD' ? 'Starboard' : 'Both'}
          </p>
        )}
      </div>

      {/* Side badge */}
      {sideIndicator && (
        <span className={`text-xs px-2 py-1 rounded ${sideIndicator.bg} ${sideIndicator.text} font-medium flex-shrink-0`}>
          {sideIndicator.label}
        </span>
      )}
    </div>
  );
}

export function AthleteCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-zinc-800/50 border-l-4 border-l-zinc-700 animate-pulse">
        <div className="h-6 w-6 rounded-full bg-zinc-700"></div>
        <div className="h-3 bg-zinc-700 rounded flex-1"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/50 border-l-4 border-l-zinc-700 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-zinc-700"></div>
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-zinc-700 rounded w-3/4"></div>
        <div className="h-2 bg-zinc-700 rounded w-1/2"></div>
      </div>
    </div>
  );
}
