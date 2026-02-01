'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserDetailCard } from '@/components/admin/users/user-detail-card';
import { MembershipList } from '@/components/admin/users/membership-list';
import { AddToClubDialog } from '@/components/admin/memberships/add-to-club-dialog';
import { EditRolesDialog } from '@/components/admin/memberships/edit-roles-dialog';
import { TypeToConfirmDialog } from '@/components/admin/type-to-confirm-dialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { Plus } from 'lucide-react';

interface Membership {
  id: string;
  name: string;
  slug: string;
  roles: string[];
  facilityId: string | null;
  facilityName: string | null;
  joinedAt: string | Date;
}

interface Facility {
  id: string;
  name: string;
  roles: string[];
  joinedAt: string;
}

interface User {
  id: string;
  email?: string;
  displayName?: string;
  phone?: string;
  createdAt: string;
  lastSignInAt?: string;
  emailConfirmed: boolean;
  facilityCount: number;
  clubCount: number;
  facilities?: Facility[];
  clubs?: Membership[];
  isBanned?: boolean;
}

interface UserDetailClientProps {
  /**
   * User data to display.
   */
  user: User;
}

/**
 * Client component wrapper for user detail page.
 *
 * Manages dialog state for:
 * - Adding user to club
 * - Editing membership roles
 * - Removing user from club
 *
 * Server page fetches data and passes to this component for rendering.
 */
export function UserDetailClient({ user }: UserDetailClientProps) {
  const router = useRouter();

  // Add to club dialog
  const [addToClubOpen, setAddToClubOpen] = useState(false);

  // Edit roles dialog
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);

  // Remove confirmation dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [membershipToRemove, setMembershipToRemove] = useState<Membership | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleEditRoles = (membership: Membership) => {
    setSelectedMembership(membership);
    setEditRolesOpen(true);
  };

  const handleRemoveClick = (membership: Membership) => {
    setMembershipToRemove(membership);
    setRemoveDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!membershipToRemove) return;

    setIsRemoving(true);
    try {
      const res = await fetch(`/api/admin/memberships/${membershipToRemove.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove membership');
      }

      showSuccessToast(`Removed from ${membershipToRemove.name}`);
      setRemoveDialogOpen(false);
      setMembershipToRemove(null);
      router.refresh();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to remove membership',
        retry: handleRemoveConfirm,
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const userName = user.displayName || user.email || 'Unknown User';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/users" className="text-sm text-[var(--text-muted)] hover:underline">
            &larr; Back to Users
          </Link>
          <h1 className="text-2xl font-bold mt-2 text-[var(--text-primary)]">User Details</h1>
        </div>
        <div className="space-x-2">
          <Link href={`/admin/users/${user.id}/edit`}>
            <Button variant="outline">Edit User</Button>
          </Link>
        </div>
      </div>

      <UserDetailCard
        user={{
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          phone: user.phone,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          emailConfirmed: user.emailConfirmed,
          isBanned: user.isBanned ?? false,
        }}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Club Memberships ({user.clubs?.length ?? 0})
          </h2>
          <Button
            onClick={() => setAddToClubOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add to Club
          </Button>
        </div>
        <MembershipList
          memberships={user.clubs ?? []}
          onEditRoles={handleEditRoles}
          onRemove={handleRemoveClick}
        />
      </div>

      {user.facilities && user.facilities.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            Facility Memberships ({user.facilities.length})
          </h2>
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Facility</th>
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Roles</th>
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Joined</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface-1)]">
                {user.facilities.map((facility) => (
                  <tr key={facility.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="p-3 text-sm font-medium text-[var(--text-primary)]">{facility.name}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {facility.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-[var(--text-muted)]">
                      {new Date(facility.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add to Club Dialog */}
      <AddToClubDialog
        open={addToClubOpen}
        onOpenChange={setAddToClubOpen}
        userId={user.id}
        userName={userName}
        onSuccess={handleSuccess}
      />

      {/* Edit Roles Dialog */}
      {selectedMembership && (
        <EditRolesDialog
          open={editRolesOpen}
          onOpenChange={setEditRolesOpen}
          membership={{
            id: selectedMembership.id,
            clubName: selectedMembership.name,
            roles: selectedMembership.roles,
          }}
          onSuccess={handleSuccess}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <TypeToConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove from Club"
        description={`This will remove the user from ${membershipToRemove?.name || 'this club'}. The membership record will be preserved but marked inactive.`}
        confirmText={membershipToRemove?.name || ''}
        confirmLabel="To confirm, type the club name"
        actionLabel="Remove from Club"
        onConfirm={handleRemoveConfirm}
        isLoading={isRemoving}
        variant="destructive"
      />
    </div>
  );
}
