'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserSearchCombobox } from './user-search-combobox';
import { RoleSelector } from './role-selector';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';

interface AddMemberDialogProps {
  /**
   * Whether the dialog is open.
   */
  open: boolean;
  /**
   * Callback to control dialog visibility.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * The club ID to add the member to.
   */
  clubId: string;
  /**
   * The club name for display.
   */
  clubName: string;
  /**
   * Callback after successful member addition.
   */
  onSuccess: () => void;
}

/**
 * Dialog for adding a user to a specific club.
 *
 * Features:
 * - User search with debounced API calls
 * - Multi-role selection (default: ATHLETE)
 * - Handles 409 conflict (already a member)
 *
 * POSTs to /api/admin/memberships with { clubId, userId, roles }.
 *
 * @example
 * ```tsx
 * <AddMemberDialog
 *   open={addOpen}
 *   onOpenChange={setAddOpen}
 *   clubId="abc-123"
 *   clubName="Rowing Club"
 *   onSuccess={() => fetchMembers()}
 * />
 * ```
 */
export function AddMemberDialog({
  open,
  onOpenChange,
  clubId,
  clubName,
  onSuccess,
}: AddMemberDialogProps) {
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    displayName?: string | null;
  } | null>(null);
  const [roles, setRoles] = useState<string[]>(['ATHLETE']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedUser(null);
    setRoles(['ATHLETE']);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId, userId: selectedUser.id, roles }),
      });

      if (res.status === 409) {
        showErrorToast({ message: 'User is already a member of this club' });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add member');
      }

      showSuccessToast('Member added successfully');
      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to add member',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member to {clubName}</DialogTitle>
          <DialogDescription>
            Search for a user and assign their roles in this club.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              User
            </label>
            <UserSearchCombobox
              value={selectedUser}
              onSelect={setSelectedUser}
              placeholder="Search by email or name..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Roles
            </label>
            <RoleSelector value={roles} onChange={setRoles} disabled={isSubmitting} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUser || roles.length === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
