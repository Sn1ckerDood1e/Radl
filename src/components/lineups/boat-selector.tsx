'use client';

import { BoatClass } from '@/generated/prisma';
import { getCapacityForBoatClass } from '@/lib/lineup/position-labels';

interface Boat {
  id: string;
  name: string;
  boatClass: BoatClass | null;
  available: boolean; // Derived from manualUnavailable and damage reports
}

interface BoatSelectorProps {
  boats: Boat[];
  selectedBoatId: string | null;
  requiredCapacity: number; // Number of seats in lineup (excluding cox)
  onSelect: (boatId: string | null) => void;
  practiceStartTime?: Date; // For double-booking check
  practiceEndTime?: Date;
  existingLineups?: Array<{ boatId: string; practiceId: string; practiceName: string }>; // For warning
}

export function BoatSelector({
  boats,
  selectedBoatId,
  requiredCapacity,
  onSelect,
  practiceStartTime,
  practiceEndTime,
  existingLineups = [],
}: BoatSelectorProps) {
  // Filter boats:
  // 1. Must be SHELL type (already filtered by parent passing only shells)
  // 2. Must be available (not damaged, not manually unavailable)
  // 3. Must match required capacity (boat class capacity = requiredCapacity)

  const compatibleBoats = boats.filter(boat => {
    if (!boat.available) return false;
    if (!boat.boatClass) return false;
    const capacity = getCapacityForBoatClass(boat.boatClass);
    return capacity === requiredCapacity;
  });

  // Check for double-booking warning (non-blocking)
  const selectedBoat = boats.find(b => b.id === selectedBoatId);
  const doubleBookingWarning = selectedBoatId
    ? existingLineups.find(l => l.boatId === selectedBoatId)
    : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">
        Select Boat
      </label>

      <select
        value={selectedBoatId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm"
      >
        <option value="">No boat selected</option>
        {compatibleBoats.map(boat => (
          <option key={boat.id} value={boat.id}>
            {boat.name} ({boat.boatClass})
          </option>
        ))}
      </select>

      {compatibleBoats.length === 0 && (
        <p className="text-amber-400 text-sm">
          No compatible {requiredCapacity}-seat boats available
        </p>
      )}

      {doubleBookingWarning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
          This boat is already assigned to "{doubleBookingWarning.practiceName}" at this time.
          You can still use it if this is intentional (split squad).
        </div>
      )}

      {selectedBoat && (
        <p className="text-zinc-500 text-xs">
          {selectedBoat.name} - {selectedBoat.boatClass}
        </p>
      )}
    </div>
  );
}
