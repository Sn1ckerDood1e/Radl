import { toast } from 'sonner';

interface ErrorToastOptions {
  message: string;
  description?: string;
  retry?: () => void | Promise<void>;
}

/**
 * Show an error toast with optional retry action.
 * Error toasts persist until dismissed (duration: Infinity).
 *
 * @example
 * ```tsx
 * showErrorToast({
 *   message: 'Failed to save changes',
 *   description: 'Network error',
 *   retry: () => handleSave(data),
 * });
 * ```
 */
export function showErrorToast({ message, description, retry }: ErrorToastOptions) {
  toast.error(message, {
    description,
    duration: Infinity, // Persist until dismissed
    action: retry
      ? {
          label: 'Retry',
          onClick: retry,
        }
      : undefined,
  });
}

/**
 * Show a success toast with auto-dismiss after 4 seconds.
 *
 * @example
 * ```tsx
 * showSuccessToast('Changes saved successfully');
 * ```
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 4000, // Auto-dismiss after 4s
  });
}

/**
 * Show an error toast with retry action for form data.
 * Useful for capturing form data and retrying the submission.
 *
 * @example
 * ```tsx
 * showActionableError(
 *   'Failed to create team',
 *   formData,
 *   async (data) => await createTeam(data)
 * );
 * ```
 */
export function showActionableError<T>(
  message: string,
  data: T,
  retryFn: (data: T) => Promise<void>
) {
  toast.error(message, {
    duration: Infinity,
    action: {
      label: 'Retry',
      onClick: () => retryFn(data),
    },
  });
}
