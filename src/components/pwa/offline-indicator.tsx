'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';

// ============================================================================
// Types
// ============================================================================

interface OfflineError {
  id: string;
  action: string;
  timestamp: Date;
  retryFn?: () => Promise<void>;
}

interface OfflineContextValue {
  isOnline: boolean;
  errors: OfflineError[];
  showOfflineError: (action: string, retryFn?: () => Promise<void>) => string;
  dismissError: (id: string) => void;
  clearErrors: () => void;
  retryError: (id: string) => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const OfflineContext = createContext<OfflineContextValue | null>(null);

/**
 * Hook to access offline indicator context
 * Provides functions to show/dismiss offline errors
 */
export function useOfflineIndicator(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineIndicator must be used within OfflineProvider');
  }
  return context;
}

// ============================================================================
// useOfflineAction - Wrap actions with offline error handling
// ============================================================================

interface UseOfflineActionOptions {
  actionDescription: string;
  onSuccess?: () => void;
  onOffline?: () => void;
}

/**
 * Hook that wraps an action with offline error detection
 * Shows offline indicator when network request fails due to connectivity
 */
export function useOfflineAction<T extends unknown[], R>(
  actionFn: (...args: T) => Promise<R>,
  options: UseOfflineActionOptions
): {
  execute: (...args: T) => Promise<R | null>;
  isLoading: boolean;
} {
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline, showOfflineError } = useOfflineIndicator();
  const { actionDescription, onSuccess, onOffline } = options;

  const execute = useCallback(
    async (...args: T): Promise<R | null> => {
      // Pre-flight check
      if (!isOnline) {
        showOfflineError(actionDescription, () => actionFn(...args).then(() => {}));
        onOffline?.();
        return null;
      }

      setIsLoading(true);
      try {
        const result = await actionFn(...args);
        onSuccess?.();
        return result;
      } catch (error) {
        // Check if this is a network error
        if (isNetworkError(error)) {
          showOfflineError(actionDescription, () => actionFn(...args).then(() => {}));
          onOffline?.();
          return null;
        }
        // Re-throw non-network errors
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [actionFn, actionDescription, isOnline, showOfflineError, onSuccess, onOffline]
  );

  return { execute, isLoading };
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network failures typically throw TypeError in fetch
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror')
    );
  }
  return false;
}

// ============================================================================
// Provider Component
// ============================================================================

interface OfflineProviderProps {
  children: ReactNode;
}

/**
 * Provider for app-wide offline indicator functionality
 * Manages offline error state and provides context to children
 */
export function OfflineProvider({ children }: OfflineProviderProps) {
  const isOnline = useOnlineStatus();
  const [errors, setErrors] = useState<OfflineError[]>([]);

  const showOfflineError = useCallback(
    (action: string, retryFn?: () => Promise<void>): string => {
      const id = crypto.randomUUID();
      setErrors((prev) => [
        ...prev,
        { id, action, timestamp: new Date(), retryFn },
      ]);
      return id;
    },
    []
  );

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const retryError = useCallback(
    async (id: string) => {
      const error = errors.find((e) => e.id === id);
      if (!error?.retryFn) return;

      try {
        await error.retryFn();
        dismissError(id);
      } catch (err) {
        // Keep the error visible if retry fails
        console.error('Retry failed:', err);
      }
    },
    [errors, dismissError]
  );

  const contextValue: OfflineContextValue = {
    isOnline,
    errors,
    showOfflineError,
    dismissError,
    clearErrors,
    retryError,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
      <OfflineIndicator />
    </OfflineContext.Provider>
  );
}

// ============================================================================
// Indicator Component
// ============================================================================

/**
 * Visual indicator for offline action failures
 * Shows toast-like notification at bottom of screen with retry option
 */
function OfflineIndicator() {
  const { isOnline, errors, dismissError, retryError, clearErrors } =
    useOfflineIndicator();

  // Auto-dismiss errors when back online after 3 seconds
  // Users have time to see "Back online" and can manually retry

  if (errors.length === 0 && isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto space-y-2">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <OfflineCloudIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-medium">You&apos;re offline</p>
              <p className="text-amber-700 text-sm">
                Some features may be unavailable
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failed action errors */}
      {errors.map((error) => (
        <div
          key={error.id}
          className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <ErrorIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-red-800 font-medium">Action failed</p>
              <p className="text-red-700 text-sm truncate">
                Couldn&apos;t {error.action.toLowerCase()}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {error.retryFn && isOnline && (
                  <button
                    onClick={() => retryError(error.id)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => dismissError(error.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => dismissError(error.id)}
              className="text-red-400 hover:text-red-600"
              aria-label="Dismiss"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Clear all button when multiple errors */}
      {errors.length > 1 && (
        <button
          onClick={clearErrors}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Clear all ({errors.length})
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function OfflineCloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636l-12.728 12.728"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
