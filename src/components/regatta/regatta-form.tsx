'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RegattaFormProps {
  teamSlug: string;
  seasons: { id: string; name: string }[];
  defaultSeasonId?: string;
  regatta?: {
    id: string;
    name: string;
    location?: string | null;
    venue?: string | null;
    timezone?: string | null;
    startDate: string;
    endDate?: string | null;
    seasonId: string;
  };
}

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
];

export function RegattaForm({ teamSlug, seasons, defaultSeasonId, regatta }: RegattaFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!regatta;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      seasonId: formData.get('seasonId') as string,
      name: formData.get('name') as string,
      location: (formData.get('location') as string) || undefined,
      venue: (formData.get('venue') as string) || undefined,
      timezone: (formData.get('timezone') as string) || undefined,
      startDate: new Date(formData.get('startDate') as string).toISOString(),
      endDate: formData.get('endDate')
        ? new Date(formData.get('endDate') as string).toISOString()
        : undefined,
    };

    try {
      const url = isEdit ? `/api/regattas/${regatta.id}` : '/api/regattas';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save regatta');
      }

      const result = await response.json();
      router.push(`/${teamSlug}/regattas/${result.regatta.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="seasonId" className="block text-sm font-medium text-zinc-300 mb-1">
          Season *
        </label>
        <select
          id="seasonId"
          name="seasonId"
          required
          defaultValue={regatta?.seasonId || defaultSeasonId}
          className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2"
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
          Regatta Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          maxLength={200}
          defaultValue={regatta?.name}
          placeholder="e.g., Head of the Charles"
          className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2 placeholder:text-zinc-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-zinc-300 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            maxLength={200}
            defaultValue={regatta?.location || ''}
            placeholder="e.g., Boston, MA"
            className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2 placeholder:text-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="venue" className="block text-sm font-medium text-zinc-300 mb-1">
            Venue
          </label>
          <input
            type="text"
            id="venue"
            name="venue"
            maxLength={200}
            defaultValue={regatta?.venue || ''}
            placeholder="e.g., Charles River"
            className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2 placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-zinc-300 mb-1">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={regatta?.timezone || ''}
          className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2"
        >
          <option value="">Select timezone...</option>
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1">Times will be displayed in this timezone</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-zinc-300 mb-1">
            Start Date *
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            required
            defaultValue={regatta?.startDate?.slice(0, 10)}
            className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-zinc-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            defaultValue={regatta?.endDate?.slice(0, 10) || ''}
            className="w-full border border-zinc-700 bg-zinc-800 text-white rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Regatta'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
