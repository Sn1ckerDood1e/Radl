'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AthleteRosterPanel } from './athlete-roster-panel';
import { BoatLineupCard } from './boat-lineup-card';
import { AthleteCard } from './athlete-card';
import { BoatSelector } from './boat-selector';
import { getSeatsForBoatClass } from '@/lib/lineup/position-labels';
import type { BoatClass } from '@/generated/prisma';

interface Athlete {
  id: string;
  displayName: string | null;
  sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
}

interface Seat {
  position: number;
  label: string;
  side: 'PORT' | 'STARBOARD' | 'NONE';
  athleteId: string | null;
}

interface Boat {
  id: string;
  name: string;
  boatClass: BoatClass | null;
  available: boolean;
}

interface Lineup {
  id: string;
  boatId: string | null;
  seats: Seat[];
}

interface MultiBoatLineupBuilderProps {
  /** Block ID */
  blockId: string;
  /** All team athletes */
  athletes: Athlete[];
  /** Available boats */
  boats: Boat[];
  /** Initial lineups for this block */
  initialLineups: Lineup[];
  /** Save handler */
  onSave: (lineups: Lineup[]) => Promise<void>;
}

/**
 * Multi-boat lineup builder for water blocks.
 *
 * Features:
 * - Add multiple boats to a single block
 * - Drag athletes from roster to any boat
 * - Drag between boats to reassign
 * - Swap when dropping on occupied seat
 * - One athlete per boat per practice (removed from available when assigned)
 */
export function MultiBoatLineupBuilder({
  blockId,
  athletes,
  boats,
  initialLineups,
  onSave,
}: MultiBoatLineupBuilderProps) {
  const [lineups, setLineups] = useState<Lineup[]>(initialLineups);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssigned, setShowAssigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBoatSelector, setShowBoatSelector] = useState<string | null>(null);

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set of all assigned athlete IDs across all lineups
  const assignedAthleteIds = useMemo(() => {
    const ids = new Set<string>();
    lineups.forEach(lineup => {
      lineup.seats.forEach(seat => {
        if (seat.athleteId) ids.add(seat.athleteId);
      });
    });
    return ids;
  }, [lineups]);

  // Find which lineup an athlete is in
  const findAthleteLineup = useCallback((athleteId: string): { lineupId: string; position: number } | null => {
    for (const lineup of lineups) {
      const seat = lineup.seats.find(s => s.athleteId === athleteId);
      if (seat) {
        return { lineupId: lineup.id, position: seat.position };
      }
    }
    return null;
  }, [lineups]);

  // Parse seat ID format: "{lineupId}-seat-{position}"
  const parseSeatId = (seatId: string): { lineupId: string; position: number } | null => {
    const match = seatId.match(/^(.+)-seat-(\d+)$/);
    if (!match) return null;
    return { lineupId: match[1], position: parseInt(match[2]) };
  };

  // Add a new boat/lineup
  const handleAddBoat = (boatId: string, boatClass: BoatClass) => {
    const newLineup: Lineup = {
      id: `new-${Date.now()}`,
      boatId,
      seats: getSeatsForBoatClass(boatClass).map(s => ({ ...s, athleteId: null })),
    };
    setLineups(prev => [...prev, newLineup]);
    setShowBoatSelector(null);
  };

  // Remove a lineup
  const handleRemoveLineup = (lineupId: string) => {
    setLineups(prev => prev.filter(l => l.id !== lineupId));
  };

  // Change boat for existing lineup
  const handleChangeBoat = (lineupId: string, boatId: string, boatClass: BoatClass) => {
    setLineups(prev => prev.map(l => {
      if (l.id !== lineupId) return l;
      // Generate new seats based on boat class, try to preserve assignments
      const newSeats = getSeatsForBoatClass(boatClass).map(s => ({
        ...s,
        athleteId: l.seats.find(os => os.position === s.position)?.athleteId || null,
      }));
      return { ...l, boatId, seats: newSeats };
    }));
    setShowBoatSelector(null);
  };

  // Remove athlete from seat
  const handleRemoveFromSeat = (lineupId: string, position: number) => {
    setLineups(prev => prev.map(l => {
      if (l.id !== lineupId) return l;
      return {
        ...l,
        seats: l.seats.map(s =>
          s.position === position ? { ...s, athleteId: null } : s
        ),
      };
    }));
  };

  // Drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Drag end - handle drop
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const athleteId = active.id as string;
    const overId = over.id as string;

    // Parse drop target
    const target = parseSeatId(overId);
    if (!target) return; // Dropped on something other than a seat

    setLineups(prev => {
      // Find source (where athlete is coming from)
      const source = findAthleteLineup(athleteId);

      // Get current athlete in target seat (for swap)
      const targetLineup = prev.find(l => l.id === target.lineupId);
      const targetSeat = targetLineup?.seats.find(s => s.position === target.position);
      const targetAthleteId = targetSeat?.athleteId;

      return prev.map(lineup => {
        // Update target lineup
        if (lineup.id === target.lineupId) {
          return {
            ...lineup,
            seats: lineup.seats.map(seat => {
              if (seat.position === target.position) {
                // Assign dragged athlete to target seat
                return { ...seat, athleteId };
              }
              // If this seat had the dragged athlete, clear it (moved within same boat)
              if (seat.athleteId === athleteId && source?.lineupId === lineup.id) {
                // Swap: put target athlete in source seat
                return { ...seat, athleteId: targetAthleteId || null };
              }
              return seat;
            }),
          };
        }

        // Update source lineup (if different from target)
        if (source && lineup.id === source.lineupId && source.lineupId !== target.lineupId) {
          return {
            ...lineup,
            seats: lineup.seats.map(seat => {
              if (seat.position === source.position) {
                // Swap: put target athlete in source seat (cross-boat swap)
                return { ...seat, athleteId: targetAthleteId || null };
              }
              return seat;
            }),
          };
        }

        return lineup;
      });
    });
  };

  // Save all lineups
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(lineups);
      toast.success('Lineups saved');
    } catch (error) {
      toast.error('Failed to save lineups');
    } finally {
      setIsSaving(false);
    }
  };

  // Find active athlete for overlay
  const activeAthlete = activeId ? athletes.find(a => a.id === activeId) : null;

  // Get boats already used in lineups (to filter in selector)
  const usedBoatIds = useMemo(
    () => new Set(lineups.map(l => l.boatId).filter(Boolean)),
    [lineups]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Two-column layout: roster | boats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Athlete roster */}
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg h-[400px]">
            <AthleteRosterPanel
              athletes={athletes}
              assignedAthleteIds={assignedAthleteIds}
              showAssigned={showAssigned}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onShowAssignedChange={setShowAssigned}
            />
          </div>

          {/* Boats grid */}
          <div className="lg:col-span-2 space-y-3">
            {lineups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lineups.map(lineup => {
                  const boat = boats.find(b => b.id === lineup.boatId) || null;
                  return (
                    <BoatLineupCard
                      key={lineup.id}
                      lineupId={lineup.id}
                      boat={boat}
                      seats={lineup.seats}
                      athletes={athletes}
                      onChangeBoat={() => setShowBoatSelector(lineup.id)}
                      onRemove={() => handleRemoveLineup(lineup.id)}
                      onRemoveFromSeat={(pos) => handleRemoveFromSeat(lineup.id, pos)}
                      isCoach
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
                <p className="text-zinc-500 text-sm">No boats added yet</p>
                <p className="text-zinc-600 text-xs mt-1">Add a boat to start building lineups</p>
              </div>
            )}

            {/* Add boat button */}
            <button
              type="button"
              onClick={() => setShowBoatSelector('new')}
              className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Boat
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Lineups'}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeAthlete && <AthleteCard athlete={activeAthlete} isDragging />}
      </DragOverlay>

      {/* Boat selector modal */}
      {showBoatSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">
              {showBoatSelector === 'new' ? 'Add Boat' : 'Change Boat'}
            </h3>
            <BoatSelector
              boats={boats.filter(b => !usedBoatIds.has(b.id) || (showBoatSelector !== 'new' && lineups.find(l => l.id === showBoatSelector)?.boatId === b.id))}
              selectedBoatId={showBoatSelector !== 'new' ? lineups.find(l => l.id === showBoatSelector)?.boatId || null : null}
              requiredCapacity={0}
              onSelect={(boatId) => {
                if (!boatId) return;
                const boat = boats.find(b => b.id === boatId);
                if (!boat?.boatClass) return;
                if (showBoatSelector === 'new') {
                  handleAddBoat(boatId, boat.boatClass);
                } else {
                  handleChangeBoat(showBoatSelector, boatId, boat.boatClass);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowBoatSelector(null)}
              className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DndContext>
  );
}
