'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentFormSchema, type CreateEquipmentFormInput } from '@/lib/validations/equipment';

interface EquipmentFormProps {
  teamSlug: string;
}

const equipmentTypes = [
  { value: 'SHELL', label: 'Shell' },
  { value: 'OAR', label: 'Oar' },
  { value: 'LAUNCH', label: 'Launch' },
  { value: 'OTHER', label: 'Other' },
] as const;

const boatClasses = [
  { value: 'SINGLE_1X', label: 'Single (1x)' },
  { value: 'DOUBLE_2X', label: 'Double (2x)' },
  { value: 'PAIR_2_MINUS', label: 'Pair (2-)' },
  { value: 'COXED_PAIR_2_PLUS', label: 'Coxed Pair (2+)' },
  { value: 'FOUR_4_MINUS', label: 'Four (4-)' },
  { value: 'COXED_FOUR_4_PLUS', label: 'Coxed Four (4+)' },
  { value: 'QUAD_4X', label: 'Quad (4x)' },
  { value: 'EIGHT_8_PLUS', label: 'Eight (8+)' },
  { value: 'OTHER', label: 'Other' },
] as const;

const weightCategories = [
  { value: 'LIGHTWEIGHT', label: 'Lightweight' },
  { value: 'MIDWEIGHT', label: 'Midweight' },
  { value: 'HEAVYWEIGHT', label: 'Heavyweight' },
] as const;

export function EquipmentForm({ teamSlug }: EquipmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEquipmentFormInput>({
    resolver: zodResolver(createEquipmentFormSchema),
    defaultValues: {
      type: 'SHELL',
    },
  });

  const selectedType = watch('type');
  const isShell = selectedType === 'SHELL';
  const currentYear = new Date().getFullYear();

  const onSubmit = async (data: CreateEquipmentFormInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Clean up data before sending to API
      // Remove empty strings and NaN values, and remove shell-specific fields for non-shells
      const cleanData: Record<string, unknown> = {
        type: data.type,
        name: data.name,
      };

      // Add optional fields only if they have valid values
      if (data.manufacturer && data.manufacturer !== '') {
        cleanData.manufacturer = data.manufacturer;
      }
      if (data.serialNumber && data.serialNumber !== '') {
        cleanData.serialNumber = data.serialNumber;
      }
      if (data.yearAcquired && !Number.isNaN(data.yearAcquired)) {
        cleanData.yearAcquired = data.yearAcquired;
      }
      if (data.purchasePrice && !Number.isNaN(data.purchasePrice)) {
        cleanData.purchasePrice = data.purchasePrice;
      }
      if (data.notes && data.notes !== '') {
        cleanData.notes = data.notes;
      }

      // Only include shell-specific fields for shells
      if (data.type === 'SHELL') {
        if (data.boatClass) {
          cleanData.boatClass = data.boatClass;
        }
        if (data.weightCategory) {
          cleanData.weightCategory = data.weightCategory;
        }
      }

      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create equipment');
      }

      // Redirect to equipment list
      router.push(`/${teamSlug}/equipment`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClassName = "block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {submitError && (
        <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {submitError}
        </div>
      )}

      {/* Equipment Type */}
      <div>
        <label htmlFor="type" className={labelClassName}>
          Equipment Type <span className="text-red-400">*</span>
        </label>
        <select
          id="type"
          {...register('type')}
          className={inputClassName}
        >
          {equipmentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="mt-1 text-sm text-red-400">{errors.type.message}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClassName}>
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className={inputClassName}
          placeholder="e.g., Varsity 8+, Port Oar Set A"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Shell-specific fields */}
      {isShell && (
        <>
          {/* Boat Class */}
          <div>
            <label htmlFor="boatClass" className={labelClassName}>
              Boat Class <span className="text-red-400">*</span>
            </label>
            <select
              id="boatClass"
              {...register('boatClass')}
              className={inputClassName}
            >
              <option value="">Select boat class</option>
              {boatClasses.map((bc) => (
                <option key={bc.value} value={bc.value}>
                  {bc.label}
                </option>
              ))}
            </select>
            {errors.boatClass && (
              <p className="mt-1 text-sm text-red-400">{errors.boatClass.message}</p>
            )}
          </div>

          {/* Weight Category */}
          <div>
            <label htmlFor="weightCategory" className={labelClassName}>
              Weight Category
            </label>
            <select
              id="weightCategory"
              {...register('weightCategory')}
              className={inputClassName}
            >
              <option value="">Not specified</option>
              {weightCategories.map((wc) => (
                <option key={wc.value} value={wc.value}>
                  {wc.label}
                </option>
              ))}
            </select>
            {errors.weightCategory && (
              <p className="mt-1 text-sm text-red-400">{errors.weightCategory.message}</p>
            )}
          </div>
        </>
      )}

      {/* Manufacturer */}
      <div>
        <label htmlFor="manufacturer" className={labelClassName}>
          Manufacturer
        </label>
        <input
          type="text"
          id="manufacturer"
          {...register('manufacturer')}
          className={inputClassName}
          placeholder="e.g., Vespoli, Concept2"
        />
        {errors.manufacturer && (
          <p className="mt-1 text-sm text-red-400">{errors.manufacturer.message}</p>
        )}
      </div>

      {/* Serial Number */}
      <div>
        <label htmlFor="serialNumber" className={labelClassName}>
          Serial Number
        </label>
        <input
          type="text"
          id="serialNumber"
          {...register('serialNumber')}
          className={inputClassName}
          placeholder="For insurance records"
        />
        {errors.serialNumber && (
          <p className="mt-1 text-sm text-red-400">{errors.serialNumber.message}</p>
        )}
      </div>

      {/* Year Acquired */}
      <div>
        <label htmlFor="yearAcquired" className={labelClassName}>
          Year Acquired
        </label>
        <input
          type="number"
          id="yearAcquired"
          {...register('yearAcquired', { valueAsNumber: true })}
          min={1900}
          max={currentYear}
          className={inputClassName}
          placeholder={currentYear.toString()}
        />
        {errors.yearAcquired && (
          <p className="mt-1 text-sm text-red-400">{errors.yearAcquired.message}</p>
        )}
      </div>

      {/* Purchase Price */}
      <div>
        <label htmlFor="purchasePrice" className={labelClassName}>
          Purchase Price ($)
        </label>
        <input
          type="number"
          id="purchasePrice"
          step="0.01"
          {...register('purchasePrice', { valueAsNumber: true })}
          className={inputClassName}
          placeholder="For insurance records"
        />
        {errors.purchasePrice && (
          <p className="mt-1 text-sm text-red-400">{errors.purchasePrice.message}</p>
        )}
      </div>

      {/* Notes / Rigging Info */}
      <div>
        <label htmlFor="notes" className={labelClassName}>
          Notes / Rigging Info
        </label>
        <textarea
          id="notes"
          rows={3}
          {...register('notes')}
          className={inputClassName}
          placeholder="Rigging specifications, storage notes, etc."
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-400">{errors.notes.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
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
          {isSubmitting ? 'Adding...' : 'Add Equipment'}
        </button>
      </div>
    </form>
  );
}
