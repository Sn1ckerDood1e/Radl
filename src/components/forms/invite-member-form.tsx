'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvitationSchema, type CreateInvitationInput } from '@/lib/validations/invitation';

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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
    setSubmitError(null);
    setSubmitSuccess(null);

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

      setSubmitSuccess(`Invitation sent to ${data.email}`);
      reset();
      onSuccess?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
  const labelClassName = "block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {submitError}
        </div>
      )}

      {submitSuccess && (
        <div className="p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          {submitSuccess}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClassName}>
          Email Address
        </label>
        <input
          type="email"
          id="email"
          {...register('email')}
          className={inputClassName}
          placeholder="athlete@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className={labelClassName}>
          Role
        </label>
        <select
          id="role"
          {...register('role')}
          className={inputClassName}
        >
          <option value="ATHLETE">Athlete</option>
          <option value="PARENT">Parent</option>
        </select>
        {errors.role && (
          <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>
        )}
      </div>

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
              className={inputClassName}
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
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
}
