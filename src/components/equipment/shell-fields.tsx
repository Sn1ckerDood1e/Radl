'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CreateEquipmentFormInput } from '@/lib/validations/equipment';

interface ShellFieldsProps {
  register: UseFormRegister<CreateEquipmentFormInput>;
  errors: FieldErrors<CreateEquipmentFormInput>;
  inputClassName: string;
  labelClassName: string;
}

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

/**
 * Shell-specific fields for the equipment form.
 * Renders boat class and weight category selects.
 */
export function ShellFields({ register, errors, inputClassName, labelClassName }: ShellFieldsProps) {
  return (
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
  );
}
