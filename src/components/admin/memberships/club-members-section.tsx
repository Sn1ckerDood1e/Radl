'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, MoreHorizontal, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddMemberDialog } from './add-member-dialog';
import { EditRolesDialog } from './edit-roles-dialog';
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers';

/**
 * Member info from the API.
 */
interface Member {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  roles: string[];
  joinedAt: string;
}

interface ClubMembersSectionProps {
  /**
   * The club ID to fetch and manage members for.
   */
  clubId: string;
  /**
   * The club name for display in dialogs.
   */
  clubName: string;
}

/**
 * Club members management section.
 *
 * Displays a table of club members with actions to add, edit roles, and remove.
 * Fetches members from /api/admin/clubs/[clubId]/members on mount.
 *
 * @example
 * ```tsx
 * <ClubMembersSection clubId="abc-123" clubName="Rowing Club" />
 * ```
 */
export function ClubMembersSection({ clubId, clubName }: ClubMembersSectionProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRemove = async () => {
    if (!selectedMember) return;

    setIsRemoving(true);
    try {
      const res = await fetch(`/api/admin/memberships/${selectedMember.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to remove member');
      }

      showSuccessToast('Member removed successfully');
      setRemoveDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      showErrorToast({ message: 'Failed to remove member' });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)] px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          Members ({members.length})
        </h2>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">
          No members yet
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
              <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
                User
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
                Roles
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">
                Joined
              </th>
              <th className="p-3 text-right text-sm font-medium text-[var(--text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[var(--border-subtle)] last:border-0"
              >
                <td className="p-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {member.displayName || member.email}
                    </p>
                    {member.displayName && (
                      <p className="text-sm text-[var(--text-muted)]">
                        {member.email}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {member.roles.map((role) => (
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
                  {formatDistanceToNow(new Date(member.joinedAt), {
                    addSuffix: true,
                  })}
                </td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMember(member);
                          setEditDialogOpen(true);
                        }}
                      >
                        Edit Roles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          setSelectedMember(member);
                          setRemoveDialogOpen(true);
                        }}
                      >
                        Remove from Club
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        clubId={clubId}
        clubName={clubName}
        onSuccess={fetchMembers}
      />

      {/* Edit Roles Dialog */}
      {selectedMember && (
        <EditRolesDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          membership={{
            id: selectedMember.id,
            clubName,
            roles: selectedMember.roles,
          }}
          onSuccess={() => {
            setEditDialogOpen(false);
            setSelectedMember(null);
            fetchMembers();
          }}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {selectedMember?.displayName || selectedMember?.email}
              </span>{' '}
              from {clubName}? This will revoke their access to this club.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
