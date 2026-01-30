'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { BlockEditor } from '@/components/practices/block-editor';
import { FormField } from '@/components/ui/form-field';
import { z } from 'zod';
import type { BlockType } from '@/lib/validations/practice';

// Time format regex (HH:MM, 24-hour format)
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Form schema for templates (time as strings HH:MM, not DateTime)
const templateFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  defaultStartTime: z.string().regex(timeFormatRegex, 'Use HH:MM format'),
  defaultEndTime: z.string().regex(timeFormatRegex, 'Use HH:MM format'),
  blocks: z.array(z.object({
    type: z.enum(['WATER', 'LAND', 'ERG', 'MEETING']),
    durationMinutes: z.number().positive().optional().nullable(),
    category: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).min(1, 'At least one block required'),
}).refine(
  (data) => data.defaultStartTime < data.defaultEndTime,
  { message: 'End time must be after start time', path: ['defaultEndTime'] }
);

type TemplateFormInput = z.infer<typeof templateFormSchema>;

interface Block {
  id?: string;
  tempId?: string;
  type: BlockType;
  durationMinutes?: number | null;
  category?: string | null;
  notes?: string | null;
}

interface TemplateFormProps {
  teamSlug: string;
  template?: {
    id: string;
    name: string;
    defaultStartTime: string;
    defaultEndTime: string;
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

export function TemplateForm({ teamSlug, template, onSuccess }: TemplateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(
    template?.blocks.map(b => ({
      id: b.id,
      type: b.type,
      durationMinutes: b.durationMinutes,
      category: b.category,
      notes: b.notes,
    })) || []
  );

  const isEditMode = !!template;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormInput>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: template?.name || '',
      defaultStartTime: template?.defaultStartTime || '06:00',
      defaultEndTime: template?.defaultEndTime || '08:00',
      blocks: template?.blocks || [],
    },
  });

  // Sync blocks state with react-hook-form
  useEffect(() => {
    setValue('blocks', blocks.map(b => ({
      type: b.type,
      durationMinutes: b.durationMinutes,
      category: b.category,
      notes: b.notes,
    })), { shouldValidate: false });
  }, [blocks, setValue]);

  const onSubmit = async (data: TemplateFormInput) => {
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
        name: data.name,
        defaultStartTime: data.defaultStartTime,
        defaultEndTime: data.defaultEndTime,
        blocks: blocks.map(b => ({
          type: b.type,
          durationMinutes: b.durationMinutes || undefined,
          category: b.category || undefined,
          notes: b.notes || undefined,
        })),
      };

      const url = isEditMode ? `/api/practice-templates/${template.id}` : '/api/practice-templates';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} template`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to template detail
        router.push(`/${teamSlug}/practice-templates/${result.template.id}`);
        router.refresh();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 [color-scheme:dark]";
  const labelClassName = "block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {submitError}
        </div>
      )}

      {/* Name */}
      <FormField
        label="Template Name"
        htmlFor="name"
        error={errors.name}
        required
      >
        <input
          type="text"
          id="name"
          {...register('name')}
          aria-invalid={errors.name ? 'true' : 'false'}
          className={`${inputClassName} ${errors.name ? 'border-red-500' : ''}`}
          placeholder="e.g., Morning Row, Sprint Practice"
        />
      </FormField>

      {/* Default Time Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Default Start Time */}
        <FormField
          label="Default Start Time"
          htmlFor="defaultStartTime"
          error={errors.defaultStartTime}
          required
        >
          <input
            type="time"
            id="defaultStartTime"
            {...register('defaultStartTime')}
            aria-invalid={errors.defaultStartTime ? 'true' : 'false'}
            className={`${inputClassName} ${errors.defaultStartTime ? 'border-red-500' : ''}`}
          />
        </FormField>

        {/* Default End Time */}
        <FormField
          label="Default End Time"
          htmlFor="defaultEndTime"
          error={errors.defaultEndTime}
          required
        >
          <input
            type="time"
            id="defaultEndTime"
            {...register('defaultEndTime')}
            aria-invalid={errors.defaultEndTime ? 'true' : 'false'}
            className={`${inputClassName} ${errors.defaultEndTime ? 'border-red-500' : ''}`}
          />
        </FormField>
      </div>

      {/* Blocks Section */}
      <div>
        <label className={labelClassName}>
          Practice Blocks <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-zinc-500 mt-1 mb-3">
          Define the block structure for this template
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
          className="flex-1 py-2 px-4 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? (isEditMode ? 'Saving...' : 'Creating...')
            : (isEditMode ? 'Save Changes' : 'Create Template')}
        </button>
      </div>
    </form>
  );
}
