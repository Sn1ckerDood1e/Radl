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
import { RoleSelector } from './role-selector';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';

interface Membership {
  id: string;
  clubName: string;
  roles: string[];
}

interface EditRolesDialogProps {
  /**
   * Whether the dialog is open.
   */
  open: boolean;
  /**
   * Callback to control dialog visibility.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Membership to edit (id, clubName, current roles).
   */
  membership: Membership;
  /**
   * Callback after successful role update.
   */
  onSuccess: () => void;
}

/**
 * Dialog for editing membership roles.
 *
 * Displays the club name (read-only) and allows editing roles via checkboxes.
 * PATCHes to /api/admin/memberships/[membershipId] with new roles.
 *
 * @example
 * ```tsx
 * <EditRolesDialog
 *   open={editOpen}
 *   onOpenChange={setEditOpen}
 *   membership={{ id: 'abc', clubName: 'Club X', roles: ['ATHLETE'] }}
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function EditRolesDialog({
  open,
  onOpenChange,
  membership,
  onSuccess,
}: EditRolesDialogProps) {
  const [roles, setRoles] = useState<string[]>(membership.roles);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset roles when dialog opens with new membership
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setRoles(membership.roles);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (roles.length === 0) {
      showErrorToast({ message: 'At least one role is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/${membership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update roles');
      }

      showSuccessToast('Roles updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to update roles',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Roles</DialogTitle>
          <DialogDescription>
            Update roles for this member in {membership.clubName}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RoleSelector value={roles} onChange={setRoles} disabled={isSubmitting} />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={roles.length === 0 || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
