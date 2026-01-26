'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const eventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof eventSchema>;

interface Club {
  id: string;
  name: string;
  slug: string;
}

export default function NewFacilityEventPage() {
  const router = useRouter();
  const params = useParams();
  const facilitySlug = params.facilitySlug as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '06:00',
      endTime: '08:00',
    },
  });

  // Load facility and clubs
  useEffect(() => {
    async function loadClubs() {
      try {
        const facilityRes = await fetch(`/api/facility/by-slug/${facilitySlug}`);
        if (!facilityRes.ok) throw new Error('Failed to get facility');
        const { facility } = await facilityRes.json();
        setFacilityId(facility.id);

        const clubsRes = await fetch(`/api/facility/${facility.id}/clubs`);
        if (!clubsRes.ok) throw new Error('Failed to get clubs');
        const { clubs: clubList } = await clubsRes.json();
        setClubs(clubList);
        // Select all clubs by default
        setSelectedClubIds(clubList.map((c: Club) => c.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clubs');
      } finally {
        setIsLoadingClubs(false);
      }
    }
    loadClubs();
  }, [facilitySlug]);

  const toggleClub = (clubId: string) => {
    setSelectedClubIds(prev =>
      prev.includes(clubId)
        ? prev.filter(id => id !== clubId)
        : [...prev, clubId]
    );
  };

  const toggleAll = () => {
    if (selectedClubIds.length === clubs.length) {
      setSelectedClubIds([]);
    } else {
      setSelectedClubIds(clubs.map(c => c.id));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (selectedClubIds.length === 0) {
      setError('Select at least one club');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Combine date and time
      const dateStr = data.date;
      const startDateTime = new Date(`${dateStr}T${data.startTime}:00`);
      const endDateTime = new Date(`${dateStr}T${data.endTime}:00`);

      const response = await fetch(`/api/facility/${facilityId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          date: startDateTime.toISOString(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          clubIds: selectedClubIds,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create event');
      }

      router.push(`/facility/${facilitySlug}/events`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/facility/${facilitySlug}/events`}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Calendar className="h-6 w-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Facility Event</h1>
        </div>
        <p className="text-[var(--text-secondary)]">
          Create an event that appears on selected clubs&apos; calendars
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Event Details */}
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border-subtle)] space-y-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Event Details</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Event Name *
            </label>
            <Input {...register('name')} placeholder="e.g., Facility Safety Meeting, Combined Practice" />
            {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Date *
              </label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-red-400 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Start Time *
              </label>
              <Input type="time" {...register('startTime')} />
              {errors.startTime && <p className="text-sm text-red-400 mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                End Time *
              </label>
              <Input type="time" {...register('endTime')} />
              {errors.endTime && <p className="text-sm text-red-400 mt-1">{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Additional information for all clubs..."
            />
          </div>
        </div>

        {/* Club Selection */}
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Select Clubs *</h2>
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              {selectedClubIds.length === clubs.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {isLoadingClubs ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading clubs...
            </div>
          ) : clubs.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)]">
              No clubs in this facility
            </div>
          ) : (
            <div className="space-y-2">
              {clubs.map((club) => (
                <label
                  key={club.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedClubIds.includes(club.id)
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)]'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded border flex items-center justify-center ${
                      selectedClubIds.includes(club.id)
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {selectedClubIds.includes(club.id) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedClubIds.includes(club.id)}
                    onChange={() => toggleClub(club.id)}
                  />
                  <span className="font-medium text-[var(--text-primary)]">{club.name}</span>
                </label>
              ))}
            </div>
          )}

          {selectedClubIds.length === 0 && !isLoadingClubs && clubs.length > 0 && (
            <p className="text-sm text-red-400 mt-2">Select at least one club</p>
          )}
        </div>

        {/* Info box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            Each selected club will receive their own copy of this event. Clubs can modify their copy independently (change times, add notes, cancel).
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/facility/${facilitySlug}/events`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || selectedClubIds.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create Event for ${selectedClubIds.length} Club${selectedClubIds.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
