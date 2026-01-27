'use client';

import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreateWorkoutInput } from '@/lib/validations/workout';

interface WorkoutIntervalRowProps {
  /** Field array index */
  index: number;
  /** React Hook Form register function */
  register: UseFormRegister<CreateWorkoutInput>;
  /** React Hook Form watch function */
  watch: UseFormWatch<CreateWorkoutInput>;
  /** Form errors */
  errors: FieldErrors<CreateWorkoutInput>;
  /** Remove handler */
  onRemove: () => void;
  /** Whether this is for water (stroke rate) or erg (split) */
  workoutContext: 'erg' | 'water';
  /** Whether row can be removed (must have at least 1 interval) */
  canRemove: boolean;
}

/**
 * Single interval row in workout builder.
 *
 * PM5 interval fields:
 * - Duration type (time or distance)
 * - Duration value (seconds or meters)
 * - Target: split for erg, stroke rate for water
 * - Rest duration
 * - Rest type (time or undefined/free)
 */
export function WorkoutIntervalRow({
  index,
  register,
  watch,
  errors,
  onRemove,
  workoutContext,
  canRemove,
}: WorkoutIntervalRowProps) {
  const durationType = watch(`intervals.${index}.durationType`);
  const intervalErrors = errors.intervals?.[index];

  // Format helpers for display
  const formatDurationPlaceholder = durationType === 'time' ? 'Seconds' : 'Meters';
  const formatTargetLabel = workoutContext === 'erg' ? 'Target Split' : 'Stroke Rate';
  const formatTargetPlaceholder = workoutContext === 'erg' ? '2:00.0' : '24';

  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
      {/* Interval number */}
      <span className="text-xs text-zinc-500 w-6 text-center">
        {index + 1}
      </span>

      {/* Duration type select */}
      <select
        {...register(`intervals.${index}.durationType`)}
        className="px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
      >
        <option value="time">Time</option>
        <option value="distance">Distance</option>
      </select>

      {/* Duration value */}
      <div className="w-24">
        <input
          type="number"
          {...register(`intervals.${index}.duration`, { valueAsNumber: true })}
          placeholder={formatDurationPlaceholder}
          className={cn(
            'w-full px-2 py-1.5 text-sm bg-zinc-800 border rounded text-zinc-200',
            'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none',
            intervalErrors?.duration ? 'border-red-500' : 'border-zinc-700'
          )}
        />
      </div>

      {/* Target (split or stroke rate) */}
      <div className="w-20">
        {workoutContext === 'erg' ? (
          <input
            type="text"
            {...register(`intervals.${index}.targetSplit`)}
            placeholder={formatTargetPlaceholder}
            className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        ) : (
          <input
            type="number"
            {...register(`intervals.${index}.targetStrokeRate`, { valueAsNumber: true })}
            placeholder={formatTargetPlaceholder}
            min={16}
            max={40}
            className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        )}
      </div>

      {/* Rest duration */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">Rest:</span>
        <input
          type="number"
          {...register(`intervals.${index}.restDuration`, { valueAsNumber: true })}
          placeholder="0"
          min={0}
          className="w-16 px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
        <span className="text-xs text-zinc-500">s</span>
      </div>

      {/* Rest type select */}
      <select
        {...register(`intervals.${index}.restType`)}
        className="px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
      >
        <option value="time">Timed</option>
        <option value="undefined">Free</option>
      </select>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Remove interval"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
