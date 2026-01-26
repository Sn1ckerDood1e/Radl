'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Ship, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BookingConflict {
  bookingId: string;
  clubName: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface BookingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    id: string;
    name: string;
    type: string;
    boatClass: string | null;
  };
  startTime: Date;
  endTime: Date;
  practiceId?: string;
  onSuccess?: () => void;
}

export function BookingRequestDialog({
  open,
  onOpenChange,
  equipment,
  startTime,
  endTime,
  practiceId,
  onSuccess,
}: BookingRequestDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<BookingConflict[] | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setConflicts(null);

    try {
      const response = await fetch('/api/equipment/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: equipment.id,
          practiceId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          notes: notes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.conflicts) {
          setConflicts(result.conflicts);
        }
        throw new Error(result.error || 'Failed to create booking request');
      }

      onSuccess?.();
      onOpenChange(false);
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-[var(--accent)]" />
            Request Equipment
          </DialogTitle>
          <DialogDescription>
            Request to book this equipment for your practice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Equipment Info */}
          <div className="bg-[var(--surface-2)] rounded-lg p-3">
            <p className="font-medium text-[var(--text-primary)]">{equipment.name}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {equipment.type}
              {equipment.boatClass && ` - ${equipment.boatClass.replace(/_/g, ' ')}`}
            </p>
          </div>

          {/* Time Info */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Calendar className="h-4 w-4" />
            <span>
              {format(startTime, 'EEEE, MMMM d')} &middot;{' '}
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>

          {/* Conflict Warning */}
          {conflicts && conflicts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Booking Conflict</p>
                  <p className="text-xs text-amber-300/80 mt-1">
                    This equipment is already booked:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {conflicts.map((conflict) => (
                      <li key={conflict.bookingId} className="text-xs text-amber-300/80">
                        {conflict.clubName}: {format(new Date(conflict.startTime), 'MMM d h:mm a')} - {format(new Date(conflict.endTime), 'h:mm a')} ({conflict.status})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !conflicts && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Reason for request, specific needs, etc."
            />
          </div>

          {/* Info */}
          <p className="text-xs text-[var(--text-muted)]">
            Your request will be sent to the facility admin for approval. You&apos;ll be notified when it&apos;s reviewed.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
