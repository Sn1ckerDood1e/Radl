'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvitationSchema, type CreateInvitationInput } from '@/lib/validations/invitation';
import { FormField } from '@/components/ui/form-field';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';

interface Athlete {
  id: string;
  name: string;
}

interface InviteMemberFormProps {
  teamSlug: string;
  onSuccess?: () => void;
}

/**
 * Form for inviting new team members (athletes or parents).
 * When inviting parents, allows linking to an existing athlete.
 *
 * @param teamSlug - Current team's slug for fetching athletes
 * @param onSuccess - Called after successful invitation
 */
export function InviteMemberForm({ teamSlug, onSuccess }: InviteMemberFormProps) {
  // --- Form State ---
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Athletes Data (for parent linking) ---
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateInvitationInput>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      role: 'ATHLETE',
    },
  });

  const selectedRole = watch('role');

  // --- Effects ---
  // Fetch athletes when role changes to PARENT (needed for parent-athlete linking)
  useEffect(() => {
    if (selectedRole === 'PARENT') {
      setLoadingAthletes(true);
      // Fetch team athletes for parent linking
      fetch(`/api/teams/${teamSlug}/athletes`)
        .then(res => res.json())
        .then(data => {
          if (data.athletes) {
            setAthletes(data.athletes);
          }
        })
        .catch(err => {
          console.error('Failed to fetch athletes:', err);
        })
        .finally(() => {
          setLoadingAthletes(false);
        });
    }
  }, [selectedRole, teamSlug]);

  const onSubmit = async (data: CreateInvitationInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invitation');
      }

      showSuccessToast('Invitation created', 'Share the join link with this member to let them join');
      reset();
      onSuccess?.();
    } catch (error) {
      showErrorToast({
        message: 'Failed to create invitation',
        description: error instanceof Error ? error.message : undefined,
        retry: () => onSubmit(data),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
  const labelClassName = "block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <FormField
        label="Email Address"
        htmlFor="email"
        error={errors.email}
        required
      >
        <input
          type="email"
          id="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          className={`${inputClassName} ${errors.email ? 'border-red-500' : ''}`}
          placeholder="athlete@example.com"
        />
      </FormField>

      {/* Role */}
      <FormField
        label="Role"
        htmlFor="role"
        error={errors.role}
        required
      >
        <select
          id="role"
          {...register('role')}
          aria-invalid={errors.role ? 'true' : 'false'}
          className={`${inputClassName} ${errors.role ? 'border-red-500' : ''}`}
        >
          <option value="ATHLETE">Athlete</option>
          <option value="PARENT">Parent</option>
        </select>
      </FormField>

      {/* Athlete Selection (for parents) */}
      {selectedRole === 'PARENT' && (
        <div>
          <label htmlFor="athleteId" className={labelClassName}>
            Link to Athlete
          </label>
          {loadingAthletes ? (
            <p className="mt-1 text-sm text-zinc-500">Loading athletes...</p>
          ) : athletes.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500">
              No athletes on team yet. Add athletes before inviting parents.
            </p>
          ) : (
            <select
              id="athleteId"
              {...register('athleteId')}
              aria-invalid={errors.athleteId ? 'true' : 'false'}
              className={`${inputClassName} ${errors.athleteId ? 'border-red-500' : ''}`}
            >
              <option value="">Select an athlete...</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </option>
              ))}
            </select>
          )}
          {errors.athleteId && (
            <p className="mt-1 text-sm text-red-400">{errors.athleteId.message}</p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting || (selectedRole === 'PARENT' && athletes.length === 0)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating Invitation...' : 'Create Invitation'}
        </button>
      </div>
    </form>
  );
}
