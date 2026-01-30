'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, Clock, Ship, Calendar, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Booking {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  startTime: string;
  endTime: string;
  notes: string | null;
  createdAt: string;
  deniedReason: string | null;
  equipment: {
    id: string;
    name: string;
    type: string;
    boatClass: string | null;
  };
  club: {
    id: string;
    name: string;
    slug: string;
  };
  practice: {
    id: string;
    name: string;
    date: string;
  } | null;
}

interface EquipmentRequestPanelProps {
  bookings: Booking[];
  onUpdate?: () => void;
}

export function EquipmentRequestPanel({ bookings: initialBookings, onUpdate }: EquipmentRequestPanelProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const pendingBookings = bookings.filter(b => b.status === 'PENDING');
  const processedBookings = bookings.filter(b => b.status !== 'PENDING');

  const handleApprove = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const response = await fetch(`/api/equipment/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (response.ok) {
        setBookings(prev =>
          prev.map(b => b.id === bookingId ? { ...b, status: 'APPROVED' as const } : b)
        );
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to approve booking:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const response = await fetch(`/api/equipment/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deny', reason: denyReason }),
      });

      if (response.ok) {
        setBookings(prev =>
          prev.map(b => b.id === bookingId ? { ...b, status: 'DENIED' as const, deniedReason: denyReason } : b)
        );
        setDenyingId(null);
        setDenyReason('');
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to deny booking:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const sameDay = startDate.toDateString() === endDate.toDateString();

    if (sameDay) {
      return `${format(startDate, 'MMM d')} ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
    }
    return `${format(startDate, 'MMM d h:mm a')} - ${format(endDate, 'MMM d h:mm a')}`;
  };

  return (
    <div className="space-y-8">
      {/* Pending Requests */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Requests
          {pendingBookings.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
              {pendingBookings.length}
            </span>
          )}
        </h2>

        {pendingBookings.length === 0 ? (
          <div className="bg-[var(--surface-1)] rounded-xl p-8 text-center border border-[var(--border-subtle)]">
            <Check className="h-12 w-12 text-teal-500 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Ship className="h-4 w-4 text-[var(--accent)]" />
                        <span className="font-medium text-[var(--text-primary)]">
                          {booking.equipment.name}
                        </span>
                        {booking.equipment.boatClass && (
                          <span className="text-xs text-[var(--text-muted)]">
                            ({booking.equipment.boatClass.replace(/_/g, ' ')})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {booking.club.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatTimeRange(booking.startTime, booking.endTime)}
                        </span>
                      </div>
                      {booking.practice && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          For: {booking.practice.name}
                        </p>
                      )}
                      {booking.notes && (
                        <p className="text-sm text-[var(--text-muted)] mt-2 italic">
                          &ldquo;{booking.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {format(new Date(booking.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {denyingId === booking.id ? (
                  <div className="p-4 bg-[var(--surface-2)] border-t border-[var(--border-subtle)]">
                    <label className="block text-sm text-[var(--text-secondary)] mb-2">
                      Reason for denial (optional)
                    </label>
                    <textarea
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm mb-3"
                      rows={2}
                      placeholder="e.g., Equipment already reserved for facility event"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDenyingId(null);
                          setDenyReason('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeny(booking.id)}
                        disabled={processingId === booking.id}
                      >
                        {processingId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Confirm Deny'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 p-4 bg-[var(--surface-2)] border-t border-[var(--border-subtle)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDenyingId(booking.id)}
                      disabled={processingId === booking.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(booking.id)}
                      disabled={processingId === booking.id}
                    >
                      {processingId === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {processedBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Recent Activity
          </h2>
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {processedBookings.slice(0, 10).map((booking) => (
              <div key={booking.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {booking.equipment.name}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {booking.club.name} - {formatTimeRange(booking.startTime, booking.endTime)}
                  </p>
                  {booking.status === 'DENIED' && booking.deniedReason && (
                    <p className="text-xs text-red-400 mt-1">Reason: {booking.deniedReason}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    booking.status === 'APPROVED'
                      ? 'bg-teal-500/20 text-teal-400'
                      : booking.status === 'DENIED'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-zinc-500/20 text-zinc-400'
                  }`}
                >
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
