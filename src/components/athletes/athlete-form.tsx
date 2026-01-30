'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateAthleteProfileSchema, type UpdateAthleteProfileInput } from '@/lib/validations/athlete';
import { Button } from '@/components/ui/button';

type Side = 'PORT' | 'STARBOARD' | 'BOTH';

interface AthleteProfile {
  id: string;
  displayName: string | null;
  sidePreference: Side | null;
  canBow: boolean;
  canCox: boolean;
  phone: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  photoUrl: string | null;
}

interface AthleteFormProps {
  memberId: string;
  initialProfile: AthleteProfile | null;
  onSuccess: (profile: AthleteProfile) => void;
}

export function AthleteForm({ memberId, initialProfile, onSuccess }: AthleteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateAthleteProfileInput>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(updateAthleteProfileSchema),
    defaultValues: {
      displayName: initialProfile?.displayName || '',
      sidePreference: initialProfile?.sidePreference || undefined,
      canBow: initialProfile?.canBow || false,
      canCox: initialProfile?.canCox || false,
      phone: initialProfile?.phone || '',
      emergencyName: initialProfile?.emergencyName || '',
      emergencyPhone: initialProfile?.emergencyPhone || '',
    },
  });

  const onSubmit = async (data: UpdateAthleteProfileInput) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/athletes/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: data.displayName || null,
          sidePreference: data.sidePreference || null,
          canBow: data.canBow || false,
          canCox: data.canCox || false,
          phone: data.phone || null,
          emergencyName: data.emergencyName || null,
          emergencyPhone: data.emergencyPhone || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      onSuccess(result.profile);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
          {submitError}
        </div>
      )}

      {/* Display Name */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          {...register('displayName')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Your name as displayed to the team"
        />
        {errors.displayName && (
          <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
        )}
      </div>

      {/* Rowing Info Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Rowing Information</h3>

        {/* Side Preference */}
        <div className="mb-4">
          <label htmlFor="sidePreference" className="block text-sm font-medium text-gray-700">
            Side Preference
          </label>
          <select
            id="sidePreference"
            {...register('sidePreference')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Not set</option>
            <option value="PORT">Port</option>
            <option value="STARBOARD">Starboard</option>
            <option value="BOTH">Both</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Which side do you prefer to row on?
          </p>
        </div>

        {/* Capabilities */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="canBow"
              {...register('canBow')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="canBow" className="text-sm font-medium text-gray-700">
              Can bow seat
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-7">
            Able to sit in the bow (front) position with steering responsibility
          </p>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="canCox"
              {...register('canCox')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="canCox" className="text-sm font-medium text-gray-700">
              Can coxswain
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-7">
            Able to serve as coxswain (steer and call commands)
          </p>
        </div>
      </div>

      {/* Contact Info Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Contact Information</h3>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            {...register('phone')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Emergency Contact Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Emergency Contact</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="emergencyName" className="block text-sm font-medium text-gray-700">
              Emergency Contact Name
            </label>
            <input
              type="text"
              id="emergencyName"
              {...register('emergencyName')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Parent/Guardian name"
            />
            {errors.emergencyName && (
              <p className="mt-1 text-sm text-red-600">{errors.emergencyName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">
              Emergency Contact Phone
            </label>
            <input
              type="tel"
              id="emergencyPhone"
              {...register('emergencyPhone')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
            {errors.emergencyPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.emergencyPhone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
        >
          Save Profile
        </Button>
      </div>
    </form>
  );
}
