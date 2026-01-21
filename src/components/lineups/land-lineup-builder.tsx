'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Athlete {
  id: string;
  displayName: string | null;
  sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
}

interface LandLineupBuilderProps {
  athletes: Athlete[];
  initialAssignedIds?: string[]; // Pre-selected athlete IDs
  ergCount?: number; // Available ergs for ERG blocks
  blockType: 'LAND' | 'ERG';
  onSave: (athleteIds: string[]) => Promise<void>;
  isSaving?: boolean;
}

export function LandLineupBuilder({
  athletes,
  initialAssignedIds = [],
  ergCount,
  blockType,
  onSave,
  isSaving = false,
}: LandLineupBuilderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialAssignedIds));
  const [searchQuery, setSearchQuery] = useState('');

  // Filter athletes by search query
  const filteredAthletes = athletes.filter((a) => {
    if (!searchQuery) return true;
    return a.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
  });

  // Toggle athlete selection
  const toggleAthlete = (athleteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  };

  // Select all filtered athletes
  const selectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredAthletes.forEach((a) => next.add(a.id));
      return next;
    });
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedIds(new Set());
  };

  // Handle save
  const handleSave = async () => {
    await onSave(Array.from(selectedIds));
  };

  // Warning state for ERG blocks
  const showErgWarning = blockType === 'ERG' && ergCount !== undefined && selectedIds.size > ergCount;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header with assignment count */}
      <div>
        <h3 className="text-lg font-semibold text-white">
          {blockType === 'ERG' ? 'Erg' : 'Land'} Assignment
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          {selectedIds.size} {selectedIds.size === 1 ? 'athlete' : 'athletes'} assigned
          {blockType === 'ERG' && ergCount !== undefined && (
            <span className="ml-2">
              • {ergCount} {ergCount === 1 ? 'erg' : 'ergs'} available
            </span>
          )}
        </p>
      </div>

      {/* Erg capacity warning */}
      {showErgWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">More athletes than ergs</p>
            <p className="text-xs text-amber-400/80 mt-1">
              You have assigned {selectedIds.size} athletes but only {ergCount} ergs are available.
              Some athletes will not have equipment.
            </p>
          </div>
        </div>
      )}

      {/* Search and bulk actions */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search athletes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={selectAll}
          disabled={filteredAthletes.length === 0}
          className="px-3 py-2 text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={selectedIds.size === 0}
          className="px-3 py-2 text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Athlete list with checkboxes */}
      <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-lg">
        {filteredAthletes.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-zinc-500">
              {searchQuery ? 'No athletes match search' : 'No athletes available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredAthletes.map((athlete) => {
              const isSelected = selectedIds.has(athlete.id);
              const displayName = athlete.displayName || 'Unknown';

              // Get initials for avatar
              const initials = displayName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              // Side preference colors
              const sideIndicator = athlete.sidePreference
                ? {
                    PORT: { color: 'border-l-blue-500', label: 'Port' },
                    STARBOARD: { color: 'border-l-green-500', label: 'Starboard' },
                    BOTH: { color: 'border-l-purple-500', label: 'Both' },
                  }[athlete.sidePreference]
                : null;

              return (
                <label
                  key={athlete.id}
                  className={`
                    flex items-center gap-3 p-3 cursor-pointer transition-colors border-l-4
                    ${sideIndicator?.color || 'border-l-zinc-800'}
                    ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/50'}
                  `}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAthlete(athlete.id)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 focus:ring-offset-zinc-900"
                  />

                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    {sideIndicator && (
                      <p className="text-xs text-zinc-400 mt-0.5">{sideIndicator.label}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2 border-t border-zinc-800">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Assignment'}
        </button>
      </div>
    </div>
  );
}
