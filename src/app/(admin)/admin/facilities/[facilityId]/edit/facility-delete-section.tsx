'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypeToConfirmDialog } from '@/components/admin/type-to-confirm-dialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';

interface CascadeInfo {
  facilityId: string;
  facilityName: string;
  clubCount: number;
  memberCount: number;
}

interface FacilityDeleteSectionProps {
  facilityId: string;
  facilityName: string;
}

/**
 * Danger Zone section for facility deletion.
 *
 * Workflow:
 * 1. User clicks "Delete Facility" button
 * 2. Fetches cascade info from DELETE /api/admin/facilities/[id] (without confirm=true)
 * 3. Opens TypeToConfirmDialog showing impact
 * 4. User must type exact facility name to enable delete
 * 5. On confirm, calls DELETE with ?confirm=true
 * 6. On success, redirects to /admin/facilities
 */
export function FacilityDeleteSection({
  facilityId,
  facilityName,
}: FacilityDeleteSectionProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cascadeInfo, setCascadeInfo] = useState<CascadeInfo | null>(null);
  const [isFetchingCascade, setIsFetchingCascade] = useState(false);

  /**
   * Fetch cascade preview when user clicks delete button.
   */
  const handleDeleteClick = async () => {
    setIsFetchingCascade(true);
    try {
      const res = await fetch(`/api/admin/facilities/${facilityId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch delete preview');
      }

      const data = await res.json();
      setCascadeInfo(data.cascade);
      setIsDialogOpen(true);
    } catch (error) {
      showErrorToast({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch delete preview',
      });
    } finally {
      setIsFetchingCascade(false);
    }
  };

  /**
   * Confirm deletion with cascade.
   */
  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/facilities/${facilityId}?confirm=true`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete facility');
      }

      showSuccessToast('Facility deleted successfully');
      setIsDialogOpen(false);
      router.push('/admin/facilities');
      router.refresh();
    } catch (error) {
      showErrorToast({
        message:
          error instanceof Error ? error.message : 'Failed to delete facility',
        retry: handleConfirmDelete,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDescription = () => {
    if (!cascadeInfo) {
      return 'This action cannot be undone.';
    }

    const parts: string[] = [];

    if (cascadeInfo.clubCount > 0) {
      parts.push(
        `${cascadeInfo.clubCount} club${cascadeInfo.clubCount === 1 ? '' : 's'}`
      );
    }

    if (cascadeInfo.memberCount > 0) {
      parts.push(
        `${cascadeInfo.memberCount} member${cascadeInfo.memberCount === 1 ? '' : 's'}`
      );
    }

    if (parts.length === 0) {
      return 'This facility has no associated clubs or members. This action cannot be undone.';
    }

    return `This will permanently delete the facility and all associated data: ${parts.join(' and ')}. This action cannot be undone.`;
  };

  return (
    <>
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
        <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">
          Permanently delete this facility and all its data. This action cannot
          be undone.
        </p>

        <Button
          variant="destructive"
          onClick={handleDeleteClick}
          loading={isFetchingCascade}
        >
          <Trash2 className="h-4 w-4" />
          Delete Facility
        </Button>
      </div>

      <TypeToConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Delete Facility"
        description={getDescription()}
        confirmText={facilityName}
        confirmLabel="To confirm, type the facility name:"
        actionLabel="Delete Facility"
        onConfirm={handleConfirmDelete}
        isLoading={isLoading}
        variant="destructive"
      />
    </>
  );
}
