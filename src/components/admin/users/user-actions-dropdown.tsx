'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserData {
  id: string;
  email: string | undefined;
  displayName: string | undefined;
}

interface UserActionsDropdownProps {
  user: UserData;
}

/**
 * User actions dropdown menu.
 *
 * Provides actions for each user row:
 * - View Details - Navigate to user detail page
 * - Edit - Navigate to edit page
 * - Reset Password - Send password reset email
 * - Deactivate/Reactivate - Toggle user account status
 *
 * Destructive actions (Deactivate) show confirmation dialog.
 */
export function UserActionsDropdown({ user }: UserActionsDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleViewDetails = () => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleEdit = () => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  const handleResetPassword = async () => {
    setActionLoading('reset-password');
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send password reset email');
      }

      toast.success('Password reset email sent', {
        description: `Reset link sent to ${user.email}`,
      });
    } catch (error) {
      toast.error('Failed to send password reset email', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading('deactivate');
    try {
      const response = await fetch(`/api/admin/users/${user.id}/deactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deactivate user');
      }

      toast.success('User deactivated', {
        description: `${user.email} can no longer sign in`,
      });

      // Refresh the page to show updated status
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error('Failed to deactivate user', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setActionLoading(null);
      setShowDeactivateDialog(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reactivate user');
      }

      toast.success('User reactivated', {
        description: `${user.email} can now sign in`,
      });

      // Refresh the page to show updated status
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error('Failed to reactivate user', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const isLoading = actionLoading !== null || isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isLoading}
            aria-label="User actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleResetPassword}
            disabled={actionLoading === 'reset-password'}
          >
            <KeyRound className="h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeactivateDialog(true)}
            variant="destructive"
          >
            <UserX className="h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReactivate}>
            <UserCheck className="h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deactivate confirmation dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{user.email || user.displayName || 'this user'}</strong>?
              They will no longer be able to sign in to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivateDialog(false)}
              disabled={actionLoading === 'deactivate'}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              loading={actionLoading === 'deactivate'}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
