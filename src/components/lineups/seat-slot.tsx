'use client';

import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import { AthleteCard } from './athlete-card';

interface SeatSlotProps {
  seatId: string; // e.g., "seat-1", "seat-bow"
  position: number;
  label: string; // "Bow", "2", "Stroke", "Cox"
  side: 'PORT' | 'STARBOARD' | 'NONE';
  athlete?: {
    id: string;
    displayName: string | null;
    sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
  } | null;
  onRemove?: () => void; // Remove athlete from seat
}

export function SeatSlot({ seatId, position, label, side, athlete, onRemove }: SeatSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: seatId });

  // Side color indicator
  const sideColor = side === 'PORT'
    ? 'border-l-blue-500'
    : side === 'STARBOARD'
    ? 'border-l-green-500'
    : 'border-l-zinc-700';

  return (
    <div
      ref={setNodeRef}
      className={`
        p-2 rounded-lg border-2 border-l-4 min-h-[60px]
        ${isOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50'}
        ${sideColor}
        transition-colors
      `}
    >
      {/* Seat label */}
      <div className="text-xs text-zinc-500 mb-1 flex justify-between items-center">
        <span className="font-medium">{label}</span>
        {athlete && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-zinc-500 hover:text-red-400 transition-colors p-0.5 rounded hover:bg-red-500/10"
            aria-label={`Remove ${athlete.displayName || 'athlete'} from ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Athlete or empty state */}
      {athlete ? (
        <AthleteCard athlete={athlete} compact />
      ) : (
        <div className="h-8 flex items-center justify-center text-zinc-600 text-sm border border-dashed border-zinc-700 rounded">
          Drop athlete
        </div>
      )}
    </div>
  );
}
