'use client';

import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableAthlete } from './draggable-athlete';

interface Athlete {
  id: string;
  displayName: string | null;
  sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
}

interface AthleteRosterPanelProps {
  athletes: Athlete[];
  assignedAthleteIds: Set<string>; // Athletes already in lineup
  showAssigned?: boolean; // Toggle to show/hide assigned athletes
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onShowAssignedChange?: (show: boolean) => void;
}

export function AthleteRosterPanel({
  athletes,
  assignedAthleteIds,
  showAssigned: showAssignedProp,
  searchQuery: searchQueryProp,
  onSearchChange,
  onShowAssignedChange,
}: AthleteRosterPanelProps) {
  // Internal state if not controlled
  const [internalSearch, setInternalSearch] = useState('');
  const [internalShowAssigned, setInternalShowAssigned] = useState(false);

  const searchQuery = searchQueryProp !== undefined ? searchQueryProp : internalSearch;
  const showAssigned = showAssignedProp !== undefined ? showAssignedProp : internalShowAssigned;

  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearch(query);
    }
  };

  const handleShowAssignedChange = (show: boolean) => {
    if (onShowAssignedChange) {
      onShowAssignedChange(show);
    } else {
      setInternalShowAssigned(show);
    }
  };

  // Filter athletes:
  // 1. By search query (displayName contains)
  // 2. By assigned status (hide if assigned and !showAssigned)
  const filtered = athletes.filter(a => {
    const matchesSearch = !searchQuery ||
      (a.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const isAssigned = assignedAthleteIds.has(a.id);
    const showThisAthlete = !isAssigned || showAssigned;
    return matchesSearch && showThisAthlete;
  });

  const athleteIds = filtered.map(a => a.id);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Athlete Roster</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {filtered.length} available {filtered.length === 1 ? 'athlete' : 'athletes'}
        </p>
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search athletes..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Toggle for showing assigned */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors">
          <input
            type="checkbox"
            checked={showAssigned}
            onChange={(e) => handleShowAssignedChange(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 focus:ring-offset-zinc-900"
          />
          Show assigned athletes
        </label>
      </div>

      {/* Scrollable athlete list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <SortableContext items={athleteIds} strategy={verticalListSortingStrategy}>
          {filtered.map(athlete => {
            const isAssigned = assignedAthleteIds.has(athlete.id);
            return (
              <DraggableAthlete
                key={athlete.id}
                athlete={athlete}
                disabled={isAssigned && showAssigned}
              />
            );
          })}
        </SortableContext>

        {filtered.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-center text-zinc-500 text-sm">
              {searchQuery ? 'No athletes match search' : 'No athletes available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
