'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClubForm } from '@/components/admin/clubs/club-form';
import { MoveClubDialog } from '@/components/admin/clubs/move-club-dialog';
import { TypeToConfirmDialog } from '@/components/admin/type-to-confirm-dialog';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';
import { AlertTriangle, ArrowRightLeft, Trash2 } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  facilityId: string | null;
  facility: {
    id: string;
    name: string;
    slug: string;
  } | null;
  memberCount: number;
  equipmentCount: number;
}

interface Facility {
  id: string;
  name: string;
}

interface CascadeInfo {
  club: {
    id: string;
    name: string;
    slug: string;
    facilityName: string | null;
  };
  cascade: {
    memberships: number;
    equipment: number;
    legacyMembers: number;
    practices: number;
    seasons: number;
    invitations: number;
  };
  warning: string;
}

interface ClubEditClientProps {
  /**
   * The club being edited.
   */
  club: Club;
  /**
   * List of all facilities for move dialog.
   */
  facilities: Facility[];
}

/**
 * Client component wrapper for club edit page.
 *
 * Manages:
 * - Move dialog state
 * - Delete dialog state
 * - Delete cascade info fetching
 *
 * Contains:
 * - ClubForm in edit mode
 * - Danger zone with Move and Delete buttons
 */
export function ClubEditClient({ club, facilities }: ClubEditClientProps) {
  const router = useRouter();

  // Move dialog state
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cascadeInfo, setCascadeInfo] = useState<CascadeInfo | null>(null);
  const [isLoadingCascade, setIsLoadingCascade] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch cascade info before showing delete dialog.
   */
  const handleDeleteClick = async () => {
    setIsLoadingCascade(true);

    try {
      const res = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch cascade info');
      }

      const data: CascadeInfo = await res.json();
      setCascadeInfo(data);
      setShowDeleteDialog(true);
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to check delete impact',
        retry: handleDeleteClick,
      });
    } finally {
      setIsLoadingCascade(false);
    }
  };

  /**
   * Actually delete the club with confirmation.
   */
  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/clubs/${club.id}?confirm=true`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete club');
      }

      showSuccessToast('Club deleted successfully');
      setShowDeleteDialog(false);
      router.push('/admin/clubs');
      router.refresh();
    } catch (error) {
      showErrorToast({
        message: error instanceof Error ? error.message : 'Failed to delete club',
        retry: handleConfirmDelete,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle successful move - refresh page data.
   */
  const handleMoveSuccess = () => {
    router.refresh();
  };

  /**
   * Build delete description with cascade info.
   */
  const buildDeleteDescription = (): string => {
    if (!cascadeInfo) {
      return 'This action cannot be undone.';
    }

    const { cascade } = cascadeInfo;
    const parts: string[] = [];

    if (cascade.memberships > 0) {
      parts.push(`${cascade.memberships} membership${cascade.memberships !== 1 ? 's' : ''}`);
    }
    if (cascade.equipment > 0) {
      parts.push(`${cascade.equipment} equipment item${cascade.equipment !== 1 ? 's' : ''}`);
    }
    if (cascade.practices > 0) {
      parts.push(`${cascade.practices} practice${cascade.practices !== 1 ? 's' : ''}`);
    }
    if (cascade.seasons > 0) {
      parts.push(`${cascade.seasons} season${cascade.seasons !== 1 ? 's' : ''}`);
    }
    if (cascade.invitations > 0) {
      parts.push(`${cascade.invitations} invitation${cascade.invitations !== 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'This club has no associated data. This action cannot be undone.';
    }

    return `This will permanently delete ${parts.join(', ')}. This action cannot be undone.`;
  };

  return (
    <div className="space-y-8">
      {/* Edit form */}
      <div className="max-w-xl">
        <ClubForm
          mode="edit"
          clubId={club.id}
          defaultValues={{
            name: club.name,
            slug: club.slug,
          }}
          currentFacilityName={club.facility?.name}
        />
      </div>

      {/* Separator */}
      <div className="border-t border-[var(--border-subtle)]" />

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          These actions are destructive and cannot be easily undone. Please proceed with caution.
        </p>

        <div className="space-y-4">
          {/* Move Club */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)]">
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">Move Club</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Transfer this club to a different facility.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowMoveDialog(true)}
              className="gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Move
            </Button>
          </div>

          {/* Delete Club */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/30 bg-red-500/5">
            <div>
              <h3 className="font-medium text-red-400">Delete Club</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Permanently delete this club and all associated data.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              loading={isLoadingCascade}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Move Dialog */}
      <MoveClubDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        club={{
          id: club.id,
          name: club.name,
          facilityId: club.facilityId,
          memberCount: club.memberCount,
        }}
        facilities={facilities}
        currentFacilityName={club.facility?.name || 'Unknown'}
        onSuccess={handleMoveSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <TypeToConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={`Delete ${club.name}`}
        description={buildDeleteDescription()}
        confirmText={club.name}
        confirmLabel="To confirm deletion, type the club name"
        actionLabel="Delete Club"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
