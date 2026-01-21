import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CreateTeamInput } from '@/lib/validations/team';

interface ColorPickerFieldsProps {
  register: UseFormRegister<CreateTeamInput>;
  errors: FieldErrors<CreateTeamInput>;
}

/**
 * Color picker fields for team branding.
 * Includes primary and secondary color pickers with descriptions.
 */
export function ColorPickerFields({ register, errors }: ColorPickerFieldsProps) {
  return (
    <>
      {/* Primary Color */}
      <div>
        <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
          Primary Color
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="primaryColor"
            {...register('primaryColor')}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500">
            Main team color (e.g., for headers)
          </span>
        </div>
        {errors.primaryColor && (
          <p className="mt-1 text-sm text-red-600">{errors.primaryColor.message}</p>
        )}
      </div>

      {/* Secondary Color */}
      <div>
        <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">
          Secondary Color
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            id="secondaryColor"
            {...register('secondaryColor')}
            className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-sm text-gray-500">
            Accent color (e.g., for highlights)
          </span>
        </div>
        {errors.secondaryColor && (
          <p className="mt-1 text-sm text-red-600">{errors.secondaryColor.message}</p>
        )}
      </div>
    </>
  );
}
