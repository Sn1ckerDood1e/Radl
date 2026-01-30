'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Ship, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingRequestDialog } from './booking-request-dialog';

interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  boatClass: string | null;
  isAvailable: boolean;
  unavailableReasons: string[];
  ownerType: 'FACILITY' | 'CLUB' | 'TEAM';
  isShared: boolean;
  pendingBooking?: {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
  };
}

interface EquipmentAvailabilityPanelProps {
  className?: string;
  practiceId?: string;
  practiceDate?: Date;
  practiceStartTime?: Date;
  practiceEndTime?: Date;
  onBookingCreated?: () => void;
}

export function EquipmentAvailabilityPanel({
  className,
  practiceId,
  practiceDate,
  practiceStartTime,
  practiceEndTime,
  onBookingCreated,
}: EquipmentAvailabilityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Booking dialog state
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Suppress unused variable warning - practiceDate is for future use
  void practiceDate;

  // Lazy load: only fetch when panel is expanded for the first time
  useEffect(() => {
    if (isExpanded && !hasFetched) {
      fetchEquipment();
    }
  }, [isExpanded, hasFetched]);

  const fetchEquipment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch both team equipment and shared facility equipment
      const response = await fetch('/api/equipment?includeShared=true');
      if (!response.ok) throw new Error('Failed to load equipment');
      const data = await response.json();

      // Mark equipment with pending bookings for this time slot
      const equipmentWithBookings = data.equipment.map((item: EquipmentItem) => {
        // For shared equipment, check if there's a pending booking for practice time
        if ((item.ownerType === 'FACILITY' || item.isShared) && practiceStartTime && practiceEndTime) {
          // This would ideally be computed server-side, but for simplicity we show the base data
          return item;
        }
        return item;
      });

      setEquipment(equipmentWithBookings);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestBooking = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setIsBookingDialogOpen(true);
  };

  const handleBookingSuccess = () => {
    // Refresh equipment list to show updated booking status
    fetchEquipment();
    onBookingCreated?.();
  };

  // Count available vs unavailable
  const availableCount = equipment.filter(e => e.isAvailable).length;
  const unavailableCount = equipment.filter(e => !e.isAvailable).length;
  const sharedCount = equipment.filter(e => e.ownerType === 'FACILITY' || e.isShared).length;

  // Group by type (SHELL, OAR, LAUNCH, OTHER)
  const groupedEquipment = equipment.reduce((acc, item) => {
    const group = acc[item.type] || [];
    group.push(item);
    acc[item.type] = group;
    return acc;
  }, {} as Record<string, EquipmentItem[]>);

  const typeOrder = ['SHELL', 'OAR', 'LAUNCH', 'OTHER'];
  const typeLabels: Record<string, string> = {
    SHELL: 'Boats',
    OAR: 'Oars',
    LAUNCH: 'Launches',
    OTHER: 'Other Equipment',
  };

  return (
    <>
      <div className={`border border-zinc-700 rounded-lg bg-zinc-800/50 ${className || ''}`}>
        {/* Header - always visible */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Equipment Availability</span>
            {hasFetched && (
              <span className="text-xs text-zinc-500">
                ({availableCount} available{unavailableCount > 0 ? `, ${unavailableCount} unavailable` : ''})
                {sharedCount > 0 && ` · ${sharedCount} shared`}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-zinc-700">
            {isLoading && (
              <p className="text-sm text-zinc-500 py-4 text-center">Loading equipment...</p>
            )}

            {error && (
              <p className="text-sm text-red-400 py-4 text-center">{error}</p>
            )}

            {!isLoading && !error && equipment.length === 0 && (
              <p className="text-sm text-zinc-500 py-4 text-center">No equipment found</p>
            )}

            {!isLoading && !error && equipment.length > 0 && (
              <div className="space-y-4 pt-3">
                {/* Shared equipment notice */}
                {sharedCount > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-300">
                      {sharedCount} piece{sharedCount > 1 ? 's' : ''} of shared facility equipment available. Click &quot;Request&quot; to book for this practice.
                    </p>
                  </div>
                )}

                {/* Unavailable equipment alert */}
                {unavailableCount > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300">
                      {unavailableCount} piece{unavailableCount > 1 ? 's' : ''} of equipment {unavailableCount > 1 ? 'are' : 'is'} currently unavailable due to damage or maintenance.
                    </p>
                  </div>
                )}

                {/* Equipment list grouped by type */}
                {typeOrder
                  .filter(type => groupedEquipment[type]?.length > 0)
                  .map(type => (
                    <div key={type}>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                        {typeLabels[type]}
                      </h4>
                      <div className="space-y-1">
                        {groupedEquipment[type].map(item => (
                          <EquipmentRow
                            key={item.id}
                            item={item}
                            canBook={!!practiceStartTime && !!practiceEndTime}
                            onRequestBooking={() => handleRequestBooking(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Info note */}
            <p className="text-xs text-zinc-600 mt-4 pt-3 border-t border-zinc-700">
              Equipment assignment happens in lineups. Shared equipment requires booking approval from facility admin.
            </p>
          </div>
        )}
      </div>

      {/* Booking Request Dialog */}
      {selectedEquipment && practiceStartTime && practiceEndTime && (
        <BookingRequestDialog
          open={isBookingDialogOpen}
          onOpenChange={setIsBookingDialogOpen}
          equipment={selectedEquipment}
          startTime={practiceStartTime}
          endTime={practiceEndTime}
          practiceId={practiceId}
          onSuccess={handleBookingSuccess}
        />
      )}
    </>
  );
}

function EquipmentRow({
  item,
  canBook,
  onRequestBooking,
}: {
  item: EquipmentItem;
  canBook: boolean;
  onRequestBooking: () => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const isShared = item.ownerType === 'FACILITY' || item.isShared;

  if (item.isAvailable) {
    return (
      <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
          <span className="text-sm text-zinc-300">{item.name}</span>
          {item.boatClass && (
            <span className="text-xs text-zinc-500">({item.boatClass.replace(/_/g, ' ')})</span>
          )}
          {isShared && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
              Shared
            </span>
          )}
        </div>
        {isShared && canBook && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRequestBooking}
            className="h-7 text-xs"
          >
            <Send className="h-3 w-3 mr-1" />
            Request
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="py-1.5 px-2 rounded bg-red-500/5 border border-red-500/10">
      <button
        type="button"
        onClick={() => setShowReasons(!showReasons)}
        className="w-full flex items-center gap-2 text-left"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
        <span className="text-sm text-zinc-400 line-through">{item.name}</span>
        {item.boatClass && (
          <span className="text-xs text-zinc-600 line-through">({item.boatClass.replace(/_/g, ' ')})</span>
        )}
        {isShared && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/60">
            Shared
          </span>
        )}
        <span className="text-xs text-red-400 ml-auto">Unavailable</span>
      </button>
      {showReasons && item.unavailableReasons.length > 0 && (
        <ul className="mt-2 ml-5 space-y-1">
          {item.unavailableReasons.map((reason, idx) => (
            <li key={idx} className="text-xs text-red-300/70">
              - {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
