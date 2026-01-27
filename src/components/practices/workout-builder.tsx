'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Save, Eye, EyeOff, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createWorkoutSchema, type CreateWorkoutInput, type WorkoutType, type WorkoutInterval } from '@/lib/validations/workout';
import { WorkoutIntervalRow } from './workout-interval-row';

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

interface WorkoutBuilderProps {
  /** Existing workout data (null for new) */
  workout: Workout | null;
  /** Block type determines target field (erg: split, water: stroke rate) */
  blockType: 'ERG' | 'WATER';
  /** Save handler */
  onSave: (data: CreateWorkoutInput) => Promise<void>;
  /** Delete handler */
  onDelete?: () => Promise<void>;
  /** Save as template handler */
  onSaveAsTemplate?: (data: CreateWorkoutInput, name: string) => Promise<void>;
}

const workoutTypes: { value: WorkoutType; label: string; description: string }[] = [
  { value: 'SINGLE_TIME', label: 'Single Time', description: 'One timed piece' },
  { value: 'SINGLE_DISTANCE', label: 'Single Distance', description: 'One distance piece' },
  { value: 'INTERVALS', label: 'Intervals', description: 'Repeated work/rest' },
  { value: 'VARIABLE_INTERVALS', label: 'Variable Intervals', description: 'Different work each interval' },
];

const PM5_MAX_INTERVALS = 50;
const PM5_WARNING_THRESHOLD = 45;

/**
 * PM5-style workout builder with dynamic interval list.
 *
 * Features:
 * - Add intervals one by one
 * - Workout type selection
 * - Interval limit (50 max per PM5)
 * - Visibility toggle for athletes
 * - Save as template option
 */
export function WorkoutBuilder({
  workout,
  blockType,
  onSave,
  onDelete,
  onSaveAsTemplate,
}: WorkoutBuilderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const workoutContext = blockType === 'ERG' ? 'erg' : 'water';

  // Initialize form with workout data or defaults
  const defaultValues = workout
    ? {
        type: workout.type,
        notes: workout.notes || undefined,
        visibleToAthletes: workout.visibleToAthletes,
        intervals: workout.intervals.map(i => ({
          durationType: i.durationType as 'time' | 'distance',
          duration: i.duration,
          targetSplit: i.targetSplit || undefined,
          targetStrokeRate: i.targetStrokeRate || undefined,
          restDuration: i.restDuration,
          restType: i.restType as 'time' | 'undefined',
        })),
      }
    : {
        type: 'INTERVALS' as const,
        visibleToAthletes: true,
        intervals: [
          {
            durationType: 'time' as const,
            duration: 300, // 5 minutes default
            restDuration: 60,
            restType: 'time' as const,
          },
        ],
      };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(createWorkoutSchema),
    defaultValues,
  }) as ReturnType<typeof useForm<CreateWorkoutInput>>;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'intervals',
  });

  const intervalCount = fields.length;
  const visibleToAthletes = watch('visibleToAthletes');
  const workoutType = watch('type');

  // Add new interval
  const handleAddInterval = () => {
    if (intervalCount >= PM5_MAX_INTERVALS) {
      toast.error('PM5 limit reached', {
        description: 'Maximum 50 intervals per workout',
      });
      return;
    }

    append({
      durationType: 'time' as const,
      duration: 300,
      restDuration: 60,
      restType: 'time' as const,
    });
  };

  // Save workout
  const handleSave = async (data: CreateWorkoutInput) => {
    setIsSaving(true);
    try {
      await onSave(data);
      toast.success('Workout saved');
    } catch (error) {
      toast.error('Failed to save workout', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete workout
  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success('Workout removed');
    } catch (error) {
      toast.error('Failed to remove workout');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save as template
  const handleSaveAsTemplate = async () => {
    if (!onSaveAsTemplate || !templateName.trim()) return;

    const data = watch();
    try {
      await onSaveAsTemplate(data, templateName.trim());
      toast.success('Template saved');
      setShowTemplateDialog(false);
      setTemplateName('');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
      {/* Header row: type selector + visibility toggle */}
      <div className="flex items-center justify-between gap-4">
        {/* Workout type selector */}
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">Workout Type</label>
          <select
            {...register('type')}
            className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            {workoutTypes.map(wt => (
              <option key={wt.value} value={wt.value}>
                {wt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => setValue('visibleToAthletes', !visibleToAthletes)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            visibleToAthletes
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          )}
        >
          {visibleToAthletes ? (
            <>
              <Eye className="h-4 w-4" />
              <span>Visible to athletes</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hidden from athletes</span>
            </>
          )}
        </button>
      </div>

      {/* Interval count indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">Intervals</span>
        <span className={cn(
          intervalCount >= PM5_WARNING_THRESHOLD ? 'text-amber-400' : 'text-zinc-500'
        )}>
          {intervalCount} / {PM5_MAX_INTERVALS}
          {intervalCount >= PM5_WARNING_THRESHOLD && (
            <span className="ml-1">(approaching PM5 limit)</span>
          )}
        </span>
      </div>

      {/* Interval list */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <WorkoutIntervalRow
            key={field.id}
            index={index}
            register={register}
            watch={watch}
            errors={errors}
            onRemove={() => remove(index)}
            workoutContext={workoutContext}
            canRemove={fields.length > 1}
          />
        ))}
      </div>

      {/* Add interval button */}
      <button
        type="button"
        onClick={handleAddInterval}
        disabled={intervalCount >= PM5_MAX_INTERVALS}
        className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Interval
      </button>

      {/* Notes */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Notes (optional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Workout instructions or notes..."
          className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
        {/* Save */}
        <button
          type="submit"
          disabled={isSaving || !isDirty}
          className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Workout'}
        </button>

        {/* Save as template */}
        {onSaveAsTemplate && (
          <button
            type="button"
            onClick={() => setShowTemplateDialog(true)}
            className="py-2 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-colors flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Save as Template
          </button>
        )}

        {/* Delete */}
        {onDelete && workout && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="py-2 px-4 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>

      {/* Template name dialog */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">Save as Template</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTemplateDialog(false)}
                className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim()}
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
