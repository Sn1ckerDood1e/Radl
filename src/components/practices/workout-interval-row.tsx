'use client';

import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
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
 *
 * Layout: Two-row on mobile, single row on desktop with logical groupings.
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
  const formatTargetPlaceholder = workoutContext === 'erg' ? '2:00.0' : '24';

  return (
    <div className="p-3 bg-zinc-800/70 rounded-lg border border-zinc-700">
      <div className="flex flex-wrap items-center gap-3">
        {/* Interval number */}
        <span className="text-sm font-medium text-zinc-400 w-6 text-center shrink-0">
          {index + 1}
        </span>

        {/* Duration section */}
        <div className="flex items-center gap-2 pr-3 md:border-r md:border-zinc-700">
          <span className="text-sm text-zinc-400 hidden sm:inline">Duration:</span>
          <select
            {...register(`intervals.${index}.durationType`)}
            className="px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="time">Time</option>
            <option value="distance">Distance</option>
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              {...register(`intervals.${index}.duration`, { valueAsNumber: true })}
              placeholder={durationType === 'time' ? '300' : '2000'}
              className={cn(
                'w-24 px-2 py-1.5 text-sm bg-zinc-800 border rounded text-zinc-200',
                'focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none',
                intervalErrors?.duration ? 'border-red-500' : 'border-zinc-700'
              )}
            />
            <span className="text-sm text-zinc-400 w-8">
              {durationType === 'time' ? 'sec' : 'm'}
            </span>
          </div>
        </div>

        {/* Target section (split or stroke rate) */}
        <div className="flex items-center gap-2 pr-3 md:border-r md:border-zinc-700">
          <span className="text-sm text-zinc-400 hidden sm:inline">Target:</span>
          {workoutContext === 'erg' ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                {...register(`intervals.${index}.targetSplit`)}
                placeholder={formatTargetPlaceholder}
                className="w-20 px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <span className="text-sm text-zinc-400">/500m</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                {...register(`intervals.${index}.targetStrokeRate`, { valueAsNumber: true })}
                placeholder={formatTargetPlaceholder}
                min={16}
                max={40}
                className="w-20 px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              />
              <span className="text-sm text-zinc-400">spm</span>
            </div>
          )}
        </div>

        {/* Rest section */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Rest:</span>
          <input
            type="number"
            {...register(`intervals.${index}.restDuration`, { valueAsNumber: true })}
            placeholder="0"
            min={0}
            className="w-20 px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
          <span className="text-sm text-zinc-400">s</span>
          <select
            {...register(`intervals.${index}.restType`)}
            className="px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="time">Timed</option>
            <option value="undefined">Free</option>
          </select>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="p-1.5 text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto"
          aria-label="Remove interval"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
