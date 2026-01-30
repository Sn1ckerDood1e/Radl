'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEquipmentFormSchema, type CreateEquipmentFormInput } from '@/lib/validations/equipment';
import { ShellFields } from './shell-fields';
import { Button } from '@/components/ui/button';

interface Equipment {
  id: string;
  type: 'SHELL' | 'OAR' | 'LAUNCH' | 'OTHER';
  name: string;
  manufacturer: string | null;
  serialNumber: string | null;
  yearAcquired: number | null;
  purchasePrice: number | { toNumber: () => number } | null;
  notes: string | null;
  boatClass: string | null;
  weightCategory: string | null;
}

interface EquipmentFormProps {
  teamSlug: string;
  /** Equipment data for editing (omit for create mode) */
  equipment?: Equipment;
}

const equipmentTypes = [
  { value: 'SHELL', label: 'Shell' },
  { value: 'OAR', label: 'Oar' },
  { value: 'LAUNCH', label: 'Launch' },
  { value: 'OTHER', label: 'Other' },
] as const;

/**
 * Form for creating new equipment.
 * Handles all equipment types with conditional rendering for shell-specific fields.
 *
 * @param teamSlug - Current team's slug for navigation after successful creation
 */
export function EquipmentForm({ teamSlug, equipment }: EquipmentFormProps) {
  const router = useRouter();
  const isEditMode = !!equipment;

  // --- Form State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEquipmentFormInput>({
    resolver: zodResolver(createEquipmentFormSchema),
    mode: 'onTouched',
    defaultValues: equipment
      ? {
          type: equipment.type,
          name: equipment.name,
          manufacturer: equipment.manufacturer || undefined,
          serialNumber: equipment.serialNumber || undefined,
          yearAcquired: equipment.yearAcquired || undefined,
          purchasePrice: equipment.purchasePrice
            ? (typeof equipment.purchasePrice === 'object' && 'toNumber' in equipment.purchasePrice
                ? equipment.purchasePrice.toNumber()
                : equipment.purchasePrice as number)
            : undefined,
          notes: equipment.notes || undefined,
          boatClass: equipment.boatClass as any || undefined,
          weightCategory: equipment.weightCategory as any || undefined,
        }
      : {
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
      // Clean up data before sending to API:
      // - Remove empty strings and NaN values
      // - Exclude shell-specific fields for non-shell equipment types
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

      const url = isEditMode
        ? `/api/equipment/${equipment.id}`
        : '/api/equipment';

      const response = await fetch(url, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} equipment`);
      }

      // Redirect to equipment detail or list
      router.push(isEditMode ? `/${teamSlug}/equipment/${equipment.id}` : `/${teamSlug}/equipment`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
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
        <ShellFields
          register={register}
          errors={errors}
          inputClassName={inputClassName}
          labelClassName={labelClassName}
        />
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
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          className="flex-1"
        >
          {isEditMode ? 'Save Changes' : 'Add Equipment'}
        </Button>
      </div>
    </form>
  );
}
