'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Eye,
  Pencil,
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

interface FacilityActionsDropdownProps {
  facilityId: string;
  facilityName: string;
  onDeleteClick?: () => void;
}

/**
 * Facility actions dropdown menu.
 *
 * Provides actions for each facility row:
 * - View Details - Navigate to facility detail page
 * - Edit - Navigate to edit page
 * - Delete - Triggers delete callback (dialog handled by parent)
 *
 * Note: Delete dialog will be implemented in plan 38-04.
 * For now, delete button triggers onDeleteClick callback if provided.
 */
export function FacilityActionsDropdown({
  facilityId,
  facilityName,
  onDeleteClick,
}: FacilityActionsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleViewDetails = () => {
    router.push(`/admin/facilities/${facilityId}`);
  };

  const handleEdit = () => {
    router.push(`/admin/facilities/${facilityId}/edit`);
  };

  const handleDelete = () => {
    setIsOpen(false);
    if (onDeleteClick) {
      onDeleteClick();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${facilityName}`}
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
          onClick={handleDelete}
          variant="destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
