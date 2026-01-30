'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSwappingStrategy } from '@dnd-kit/sortable';
import { Ship, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SeatSlot } from './seat-slot';
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
}

interface BoatLineupCardProps {
  /** Lineup ID (unique identifier for this lineup) */
  lineupId: string;
  /** Selected boat for this lineup */
  boat: Boat | null;
  /** Seat assignments */
  seats: Seat[];
  /** All athletes (for lookup) */
  athletes: Athlete[];
  /** Handler to change boat */
  onChangeBoat: () => void;
  /** Handler to remove this lineup */
  onRemove: () => void;
  /** Handler to remove athlete from seat */
  onRemoveFromSeat: (position: number) => void;
  /** Whether user is coach */
  isCoach?: boolean;
}

/**
 * Single boat card within multi-boat lineup builder.
 *
 * Features:
 * - Compact header with boat name
 * - Seat grid as drop targets
 * - Remove boat button
 * - Stats: X/Y seats filled
 */
export function BoatLineupCard({
  lineupId,
  boat,
  seats,
  athletes,
  onChangeBoat,
  onRemove,
  onRemoveFromSeat,
  isCoach = false,
}: BoatLineupCardProps) {
  // Create droppable zone for this boat
  const { setNodeRef, isOver } = useDroppable({
    id: `boat-${lineupId}`,
  });

  // Count filled seats
  const filledSeats = useMemo(
    () => seats.filter(s => s.athleteId).length,
    [seats]
  );

  // Create sortable items for seats
  const seatIds = useMemo(
    () => seats.map(s => `${lineupId}-seat-${s.position}`),
    [lineupId, seats]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-zinc-800/50 border rounded-lg transition-colors',
        isOver ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-700'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
        <div className="flex items-center gap-2 min-w-0">
          <Ship className="h-4 w-4 text-blue-400 flex-shrink-0" />
          {boat ? (
            <span className="text-sm font-medium text-zinc-200 truncate">
              {boat.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={onChangeBoat}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Select boat...
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Seat count */}
          <span className={cn(
            'text-xs',
            filledSeats < seats.length ? 'text-amber-400' : 'text-teal-400'
          )}>
            {filledSeats}/{seats.length}
          </span>

          {/* Remove boat (coaches only) */}
          {isCoach && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              aria-label="Remove boat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Seats */}
      <SortableContext items={seatIds} strategy={rectSwappingStrategy}>
        <div className="p-2 space-y-1">
          {seats.map((seat) => {
            const athlete = seat.athleteId
              ? athletes.find(a => a.id === seat.athleteId)
              : null;

            return (
              <SeatSlot
                key={seat.position}
                seatId={`${lineupId}-seat-${seat.position}`}
                position={seat.position}
                label={seat.label}
                side={seat.side}
                athlete={athlete}
                onRemove={() => onRemoveFromSeat(seat.position)}
                compact
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}
