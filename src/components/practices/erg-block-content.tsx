'use client';

import { WorkoutBuilder } from '@/components/practices/workout-builder';
import type { CreateWorkoutInput, WorkoutType } from '@/lib/validations/workout';

interface Workout {
  id: string;
  type: WorkoutType;
  notes: string | null;
  visibleToAthletes: boolean;
  intervals: Array<{
    id: string;
    position: number;
    durationType: string;
    duration: number;
    targetSplit: string | null;
    targetStrokeRate: number | null;
    restDuration: number;
    restType: string;
  }>;
}

interface ErgBlockContentProps {
  /** Block ID */
  blockId: string;
  /** Practice ID for API calls */
  practiceId: string;
  /** Block type (ERG or WATER for workout context) */
  blockType: 'ERG' | 'WATER';
  /** Existing workout (null if none) */
  workout: Workout | null;
  /** Refresh handler after save */
  onRefresh: () => void;
}

/**
 * Erg block expanded content - workout builder.
 * Also used for water blocks with workout definitions.
 */
export function ErgBlockContent({
  blockId,
  practiceId,
  blockType,
  workout,
  onRefresh,
}: ErgBlockContentProps) {
  const handleSave = async (data: CreateWorkoutInput) => {
    const response = await fetch(
      `/api/practices/${practiceId}/blocks/${blockId}/workout`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to save workout');
    }

    onRefresh();
  };

  const handleDelete = async () => {
    const response = await fetch(
      `/api/practices/${practiceId}/blocks/${blockId}/workout`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error('Failed to delete workout');
    }

    onRefresh();
  };

  const handleSaveAsTemplate = async (data: CreateWorkoutInput, name: string) => {
    const response = await fetch('/api/workout-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, name }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to save template');
    }
  };

  return (
    <WorkoutBuilder
      workout={workout}
      blockType={blockType}
      onSave={handleSave}
      onDelete={workout ? handleDelete : undefined}
      onSaveAsTemplate={handleSaveAsTemplate}
    />
  );
}
