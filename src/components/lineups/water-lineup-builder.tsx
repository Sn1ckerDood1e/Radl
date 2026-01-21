'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BoatClass } from '@/generated/prisma';
import { getSeatsForBoatClass } from '@/lib/lineup/position-labels';
import { AthleteRosterPanel } from './athlete-roster-panel';
import { SeatSlot } from './seat-slot';
import { AthleteCard } from './athlete-card';
import { BoatSelector } from './boat-selector';

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

interface WaterLineupBuilderProps {
  blockId: string;
  boatClass: BoatClass; // The target boat class for this lineup
  athletes: Athlete[];
  boats: Boat[];
  initialSeats?: Seat[];
  initialBoatId?: string | null;
  onSave: (data: { seats: Seat[]; boatId: string | null }) => Promise<void>;
  existingLineups?: Array<{ boatId: string; practiceId: string; practiceName: string }>;
}

export function WaterLineupBuilder({
  blockId,
  boatClass,
  athletes,
  boats,
  initialSeats,
  initialBoatId = null,
  onSave,
  existingLineups = [],
}: WaterLineupBuilderProps) {
  // Initialize seats from boat class if no initial seats
  const defaultSeats = useMemo(() => {
    const template = getSeatsForBoatClass(boatClass);
    return template.map(t => ({ ...t, athleteId: null }));
  }, [boatClass]);

  const [seats, setSeats] = useState<Seat[]>(initialSeats || defaultSeats);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(initialBoatId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssigned, setShowAssigned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set of assigned athlete IDs (for roster panel filtering)
  const assignedAthleteIds = useMemo(
    () => new Set(seats.filter(s => s.athleteId).map(s => s.athleteId!)),
    [seats]
  );

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const athleteId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a seat slot
    if (overId.startsWith('seat-')) {
      const seatPosition = parseInt(overId.replace('seat-', ''));

      setSeats(prev => {
        // Remove athlete from any existing seat
        const updated = prev.map(s =>
          s.athleteId === athleteId ? { ...s, athleteId: null } : s
        );

        // Assign to new seat
        return updated.map(s =>
          s.position === seatPosition ? { ...s, athleteId } : s
        );
      });
    }
  }

  function handleRemoveFromSeat(position: number) {
    setSeats(prev =>
      prev.map(s =>
        s.position === position ? { ...s, athleteId: null } : s
      )
    );
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave({ seats, boatId: selectedBoatId });
    } finally {
      setIsSaving(false);
    }
  }

  // Get capacity for boat selector (exclude cox)
  const capacity = seats.filter(s => s.label !== 'Cox').length;

  // Find active athlete for overlay
  const activeAthlete = activeId ? athletes.find(a => a.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster panel - left side */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg h-[500px]">
          <AthleteRosterPanel
            athletes={athletes}
            assignedAthleteIds={assignedAthleteIds}
            showAssigned={showAssigned}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onShowAssignedChange={setShowAssigned}
          />
        </div>

        {/* Seat layout - center */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-medium text-zinc-200">
            {boatClass.replace(/_/g, ' ')} Lineup
          </h3>

          <div className="space-y-2">
            {seats.map(seat => {
              const athlete = seat.athleteId
                ? athletes.find(a => a.id === seat.athleteId)
                : null;

              return (
                <SeatSlot
                  key={seat.position}
                  seatId={`seat-${seat.position}`}
                  position={seat.position}
                  label={seat.label}
                  side={seat.side}
                  athlete={athlete}
                  onRemove={() => handleRemoveFromSeat(seat.position)}
                />
              );
            })}
          </div>

          {/* Lineup stats */}
          <div className="text-sm text-zinc-500">
            {assignedAthleteIds.size} / {seats.length} seats filled
            {assignedAthleteIds.size < seats.length && (
              <span className="text-amber-400 ml-2">
                (partial lineup)
              </span>
            )}
          </div>
        </div>

        {/* Boat selector - right side */}
        <div className="lg:col-span-1 space-y-4">
          <BoatSelector
            boats={boats}
            selectedBoatId={selectedBoatId}
            requiredCapacity={capacity}
            onSelect={setSelectedBoatId}
            existingLineups={existingLineups}
          />

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Lineup'}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeAthlete ? (
          <AthleteCard athlete={activeAthlete} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
