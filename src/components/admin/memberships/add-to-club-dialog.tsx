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
import { ClubSearchCombobox } from './club-search-combobox';
import { RoleSelector } from './role-selector';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { UserPlus } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  facilityName: string | null;
}

interface AddToClubDialogProps {
  /**
   * Whether the dialog is open.
   */
  open: boolean;
  /**
   * Callback when open state changes.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The user ID to add to a club.
   */
  userId: string;
  /**
   * User display name for dialog description.
   */
  userName: string;
  /**
   * Callback after successful addition.
   */
  onSuccess: () => void;
}

/**
 * Dialog for adding a user to a club.
 *
 * Features:
 * - Club search combobox for selecting target club
 * - Role selector with multiple role selection
 * - Handles 409 (already member) with appropriate message
 *
 * @example
 * ```tsx
 * <AddToClubDialog
 *   open={showAddDialog}
 *   onOpenChange={setShowAddDialog}
 *   userId={user.id}
 *   userName={user.displayName || user.email}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function AddToClubDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: AddToClubDialogProps) {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['ATHLETE']);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!selectedClub) {
      showErrorToast({ message: 'Please select a club' });
      return;
    }

    if (selectedRoles.length === 0) {
      showErrorToast({ message: 'Please select at least one role' });
      return;
    }

    setIsAdding(true);

    try {
      const res = await fetch('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: selectedClub.id,
          userId,
          roles: selectedRoles,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        showErrorToast({
          message: data.error || 'User is already a member of this club',
        });
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add user to club');
      }

      const data = await res.json();
      const message = data.reactivated
        ? `Membership reactivated in ${selectedClub.name}`
        : `Added to ${selectedClub.name}`;

      showSuccessToast(message);

      // Reset state
      setSelectedClub(null);
      setSelectedRoles(['ATHLETE']);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to add user to club',
        retry: handleAdd,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isAdding) {
      if (!newOpen) {
        // Reset state when closing
        setSelectedClub(null);
        setSelectedRoles(['ATHLETE']);
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add to Club
          </DialogTitle>
          <DialogDescription>
            Add <strong>{userName}</strong> to a club with selected roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Club selection */}
          <div className="space-y-2">
            <label
              htmlFor="club-select"
              className="block text-sm font-medium text-[var(--text-primary)]"
            >
              Select Club
            </label>
            <ClubSearchCombobox
              value={selectedClub}
              onSelect={setSelectedClub}
              placeholder="Search for a club..."
              disabled={isAdding}
            />
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Assign Roles
            </label>
            <RoleSelector
              value={selectedRoles}
              onChange={setSelectedRoles}
              disabled={isAdding}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedClub || selectedRoles.length === 0 || isAdding}
            loading={isAdding}
          >
            Add to Club
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
