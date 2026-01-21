'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { BlockEditor } from './block-editor';
import { createPracticeFormSchema, type CreatePracticeFormInput, type BlockType } from '@/lib/validations/practice';

interface Block {
  id?: string;
  tempId?: string;
  type: BlockType;
  durationMinutes?: number | null;
  category?: string | null;
  notes?: string | null;
}

interface PracticeFormProps {
  teamSlug: string;
  seasonId: string;
  practice?: {
    id: string;
    name: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    notes?: string | null;
    blocks: Array<{
      id: string;
      type: BlockType;
      durationMinutes?: number | null;
      category?: string | null;
      notes?: string | null;
    }>;
  };
  onSuccess?: () => void;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function combineDateAndTime(dateStr: string, timeStr: string): string {
  // Create ISO datetime string for API
  const date = new Date(dateStr + 'T' + timeStr + ':00');
  return date.toISOString();
}

export function PracticeForm({ teamSlug, seasonId, practice, onSuccess }: PracticeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(
    practice?.blocks.map(b => ({
      id: b.id,
      type: b.type,
      durationMinutes: b.durationMinutes,
      category: b.category,
      notes: b.notes,
    })) || []
  );

  const isEditMode = !!practice;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePracticeFormInput>({
    resolver: zodResolver(createPracticeFormSchema),
    defaultValues: {
      seasonId,
      name: practice?.name || '',
      date: practice ? formatDateForInput(new Date(practice.date)) : '',
      startTime: practice ? formatTimeForInput(new Date(practice.startTime)) : '',
      endTime: practice ? formatTimeForInput(new Date(practice.endTime)) : '',
      notes: practice?.notes || '',
      blocks: practice?.blocks || [],
    },
  });

  const onSubmit = async (data: CreatePracticeFormInput) => {
    // Validate blocks before submission
    if (blocks.length === 0) {
      setSubmitError('At least one block is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare API payload
      const apiPayload = {
        seasonId: data.seasonId,
        name: data.name,
        date: combineDateAndTime(data.date, data.startTime),
        startTime: combineDateAndTime(data.date, data.startTime),
        endTime: combineDateAndTime(data.date, data.endTime),
        notes: data.notes || undefined,
        blocks: blocks.map(b => ({
          type: b.type,
          durationMinutes: b.durationMinutes || undefined,
          category: b.category || undefined,
          notes: b.notes || undefined,
        })),
      };

      const url = isEditMode ? `/api/practices/${practice.id}` : '/api/practices';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} practice`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to practice detail
        router.push(`/${teamSlug}/practices/${result.practice.id}`);
        router.refresh();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClassName = "block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {submitError}
        </div>
      )}

      {/* Hidden seasonId */}
      <input type="hidden" {...register('seasonId')} />

      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClassName}>
          Practice Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className={inputClassName}
          placeholder="e.g., Morning Row, Sprint Practice"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Date and Time Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date */}
        <div>
          <label htmlFor="date" className={labelClassName}>
            Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            id="date"
            {...register('date')}
            className={inputClassName}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-400">{errors.date.message}</p>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label htmlFor="startTime" className={labelClassName}>
            Start Time <span className="text-red-400">*</span>
          </label>
          <input
            type="time"
            id="startTime"
            {...register('startTime')}
            className={inputClassName}
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-400">{errors.startTime.message}</p>
          )}
        </div>

        {/* End Time */}
        <div>
          <label htmlFor="endTime" className={labelClassName}>
            End Time <span className="text-red-400">*</span>
          </label>
          <input
            type="time"
            id="endTime"
            {...register('endTime')}
            className={inputClassName}
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-red-400">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={labelClassName}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={2}
          {...register('notes')}
          className={inputClassName}
          placeholder="Additional practice notes..."
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-400">{errors.notes.message}</p>
        )}
      </div>

      {/* Blocks Section */}
      <div>
        <label className={labelClassName}>
          Practice Blocks <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-zinc-500 mt-1 mb-3">
          Add blocks to structure your practice (water, land, erg)
        </p>
        <BlockEditor blocks={blocks} onChange={setBlocks} />
        {errors.blocks && (
          <p className="mt-2 text-sm text-red-400">{errors.blocks.message}</p>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2 px-4 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? (isEditMode ? 'Saving...' : 'Creating...')
            : (isEditMode ? 'Save Changes' : 'Create Practice')}
        </button>
      </div>
    </form>
  );
}
