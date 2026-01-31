'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { AlertTriangle, ArrowRight, Building2, Users } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
}

interface Club {
  id: string;
  name: string;
  facilityId: string | null;
  memberCount: number;
}

interface MoveClubDialogProps {
  /**
   * Whether the dialog is open.
   */
  open: boolean;
  /**
   * Callback when open state changes.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The club to move.
   */
  club: Club;
  /**
   * List of all facilities to select from.
   */
  facilities: Facility[];
  /**
   * Name of the current facility.
   */
  currentFacilityName: string;
  /**
   * Callback after successful move.
   */
  onSuccess: () => void;
}

/**
 * Dialog for moving a club to a different facility.
 *
 * Shows impact summary including:
 * - Number of members that will be transferred
 * - Note about equipment ownership (club vs facility)
 *
 * Calls POST /api/admin/clubs/[id]/move on confirm.
 *
 * @example
 * ```tsx
 * <MoveClubDialog
 *   open={showMoveDialog}
 *   onOpenChange={setShowMoveDialog}
 *   club={club}
 *   facilities={facilities}
 *   currentFacilityName="Riverside Facility"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function MoveClubDialog({
  open,
  onOpenChange,
  club,
  facilities,
  currentFacilityName,
  onSuccess,
}: MoveClubDialogProps) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  // Filter out current facility from options
  const availableFacilities = facilities.filter(
    (f) => f.id !== club.facilityId
  );

  // Get selected facility name for display
  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  const handleConfirm = async () => {
    if (!selectedFacilityId) {
      showErrorToast({ message: 'Please select a target facility' });
      return;
    }

    setIsMoving(true);

    try {
      const res = await fetch(`/api/admin/clubs/${club.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFacilityId: selectedFacilityId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to move club');
      }

      showSuccessToast(
        `Club moved to ${selectedFacility?.name || 'new facility'}`
      );

      // Reset state
      setSelectedFacilityId('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to move club',
        retry: handleConfirm,
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isMoving) {
      // Reset selection when closing
      if (!newOpen) {
        setSelectedFacilityId('');
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Move Club to Another Facility
          </DialogTitle>
          <DialogDescription>
            Moving <strong>{club.name}</strong> from{' '}
            <strong>{currentFacilityName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target facility selection */}
          <div className="space-y-2">
            <label
              htmlFor="target-facility"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Select Target Facility
            </label>
            <Select
              value={selectedFacilityId}
              onValueChange={setSelectedFacilityId}
            >
              <SelectTrigger id="target-facility" className="w-full">
                <SelectValue placeholder="Choose a facility..." />
              </SelectTrigger>
              <SelectContent>
                {availableFacilities.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-[var(--text-muted)]">
                    No other facilities available
                  </div>
                ) : (
                  availableFacilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Move visualization */}
          {selectedFacilityId && (
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <div className="text-sm text-[var(--text-muted)]">From</div>
                <div className="font-medium text-[var(--text-primary)]">
                  {currentFacilityName}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--text-muted)]" />
              <div className="text-center">
                <div className="text-sm text-[var(--text-muted)]">To</div>
                <div className="font-medium text-teal-400">
                  {selectedFacility?.name}
                </div>
              </div>
            </div>
          )}

          {/* Impact summary */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Impact Summary</span>
            </div>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-[var(--text-muted)]" />
                <span>
                  <strong>{club.memberCount}</strong> member
                  {club.memberCount !== 1 ? 's' : ''} will be transferred with
                  this club
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-[var(--text-muted)]" />
                <span>Club-owned equipment will move with the club</span>
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-[var(--text-muted)]" />
                <span>Facility equipment remains at the original facility</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFacilityId || isMoving}
            loading={isMoving}
          >
            Move Club
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
