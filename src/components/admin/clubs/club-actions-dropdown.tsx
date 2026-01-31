'use client';

import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClubActionsDropdownProps {
  clubId: string;
  clubName: string;
  facilityId: string | null;
  onMoveClick: () => void;
  onDeleteClick: () => void;
}

/**
 * Club actions dropdown menu.
 *
 * Provides actions for each club row:
 * - View Details - Navigate to club detail page
 * - Edit - Navigate to edit page
 * - Move to Another Facility - Triggers move dialog callback
 * - Delete - Triggers delete dialog callback
 *
 * Move and delete dialogs are handled by parent component (38-06).
 */
export function ClubActionsDropdown({
  clubId,
  clubName,
  facilityId,
  onMoveClick,
  onDeleteClick,
}: ClubActionsDropdownProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/admin/clubs/${clubId}`);
  };

  const handleEdit = () => {
    router.push(`/admin/clubs/${clubId}/edit`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${clubName}`}
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
        <DropdownMenuItem onClick={onMoveClick}>
          <ArrowRightLeft className="h-4 w-4" />
          Move to Another Facility
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDeleteClick} variant="destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
