'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Props for the TypeToConfirmDialog component.
 */
interface TypeToConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title (e.g., "Delete Facility") */
  title: string;
  /** Description/warning text (e.g., "This will delete 5 clubs and 120 members") */
  description: string;
  /** Text user must type exactly to confirm (e.g., facility name) */
  confirmText: string;
  /** Label above input field (default: "To confirm, type") */
  confirmLabel?: string;
  /** Confirm button text (default: "Delete") */
  actionLabel?: string;
  /** Callback when user confirms */
  onConfirm: () => void | Promise<void>;
  /** Whether the confirm action is in progress */
  isLoading?: boolean;
  /** Visual variant for the dialog */
  variant?: 'destructive' | 'warning';
}

/**
 * Reusable type-to-confirm dialog for dangerous operations.
 *
 * Requires the user to type an exact string (e.g., entity name)
 * before the confirm button becomes enabled. GitHub-style delete pattern.
 *
 * @example
 * ```tsx
 * <TypeToConfirmDialog
 *   open={showDeleteDialog}
 *   onOpenChange={setShowDeleteDialog}
 *   title="Delete Facility"
 *   description="This will permanently delete the facility and all associated clubs."
 *   confirmText={facility.name}
 *   onConfirm={handleDelete}
 *   isLoading={isDeleting}
 *   variant="destructive"
 * />
 * ```
 */
export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel = 'To confirm, type',
  actionLabel = 'Delete',
  onConfirm,
  isLoading = false,
  variant = 'destructive',
}: TypeToConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const isConfirmEnabled = inputValue === confirmText;

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const handleConfirm = async () => {
    if (isConfirmEnabled) {
      await onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmEnabled && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            className={variant === 'destructive' ? 'text-destructive' : ''}
          >
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <label
            htmlFor="confirm-input"
            className="block text-sm text-[var(--text-secondary)]"
          >
            {confirmLabel}{' '}
            <strong className="text-[var(--text-primary)]">{confirmText}</strong>
          </label>
          <Input
            id="confirm-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={confirmText}
            autoComplete="off"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading}
            loading={isLoading}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
