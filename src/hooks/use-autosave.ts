'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

interface UseAutosaveOptions<T> {
  /** Initial value */
  initialValue: T;
  /** Save function - should throw on error */
  onSave: (value: T) => Promise<void>;
  /** Optional: Custom comparison function */
  isEqual?: (a: T, b: T) => boolean;
}

interface UseAutosaveReturn<T> {
  /** Current value (optimistic during save) */
  value: T;
  /** Whether a save is in progress */
  isPending: boolean;
  /** Trigger save with new value */
  save: (newValue: T) => void;
  /** Reset to a new initial value (e.g., after external update) */
  reset: (newValue: T) => void;
}

/**
 * Hook for autosave with optimistic updates.
 *
 * Features:
 * - Optimistic UI updates (instant feedback)
 * - Automatic rollback on save failure
 * - Error toast with retry button
 * - Silent success (no toast)
 * - Skips save if value unchanged
 *
 * @example
 * const { value, isPending, save } = useAutosave({
 *   initialValue: practice.name,
 *   onSave: async (name) => {
 *     await fetch(`/api/practices/${id}`, {
 *       method: 'PATCH',
 *       body: JSON.stringify({ name })
 *     });
 *   }
 * });
 */
export function useAutosave<T>({
  initialValue,
  onSave,
  isEqual = (a, b) => a === b,
}: UseAutosaveOptions<T>): UseAutosaveReturn<T> {
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);

  const save = (newValue: T) => {
    // Skip if value unchanged
    if (isEqual(newValue, initialValue)) {
      return;
    }

    // Optimistic update
    setOptimisticValue(newValue);

    startTransition(async () => {
      try {
        await onSave(newValue);
        // Silent success - no toast
      } catch (error) {
        // Rollback to initial value
        setOptimisticValue(initialValue);

        // Show error toast with retry
        const message = error instanceof Error ? error.message : 'Failed to save';
        toast.error('Save failed', {
          description: message,
          action: {
            label: 'Retry',
            onClick: () => save(newValue),
          },
          duration: Infinity, // Don't auto-dismiss errors
        });
      }
    });
  };

  const reset = (newValue: T) => {
    setOptimisticValue(newValue);
  };

  return {
    value: optimisticValue,
    isPending,
    save,
    reset,
  };
}
