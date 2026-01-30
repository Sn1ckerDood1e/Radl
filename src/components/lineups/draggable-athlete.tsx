'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { AthleteCard } from './athlete-card';

interface DraggableAthleteProps {
  athlete: {
    id: string;
    displayName: string | null;
    sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
  };
  disabled?: boolean; // For already-assigned athletes if filter is off
}

export function DraggableAthlete({ athlete, disabled = false }: DraggableAthleteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: athlete.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Drag handle - only this triggers drag on touch */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className={`
          touch-none p-2 rounded-lg
          ${disabled
            ? 'text-zinc-600 cursor-not-allowed'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 cursor-grab active:cursor-grabbing'
          }
          transition-colors
        `}
        aria-label={`Drag ${athlete.displayName || 'athlete'} to reorder`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Card content - scrollable, not draggable */}
      <div className="flex-1 min-w-0">
        <AthleteCard athlete={athlete} isDragging={isDragging} />
      </div>
    </div>
  );
}
