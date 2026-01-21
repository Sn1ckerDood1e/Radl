'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
      {...attributes}
      {...listeners}
      className={disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
    >
      <AthleteCard athlete={athlete} isDragging={isDragging} />
    </div>
  );
}
