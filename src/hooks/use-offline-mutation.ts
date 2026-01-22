'use client';

import { useState, useCallback } from 'react';
import { executeWithOfflineFallback } from '@/lib/db/offline-mutations';

interface UseOfflineMutationOptions<T, R> {
  // The online API call
  mutationFn: (payload: T) => Promise<R>;
  // Entity info for offline queue
  entity: 'practice' | 'lineup' | 'assignment';
  operation: 'create' | 'update' | 'delete';
  // Get entity ID from payload (for update/delete)
  getEntityId: (payload: T) => string;
  // Optimistic update (optional)
  onOptimisticUpdate?: (payload: T) => Promise<void>;
  // Rollback on failure (optional)
  onRollback?: (payload: T) => Promise<void>;
  // Callbacks
  onSuccess?: (result: R | null, mode: 'online' | 'offline') => void;
  onError?: (error: Error) => void;
}

interface UseOfflineMutationResult<T> {
  mutate: (payload: T) => Promise<void>;
  isLoading: boolean;
  isOffline: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for mutations that work offline
 * Tries online first, queues for background sync if offline
 */
export function useOfflineMutation<T, R = unknown>(
  options: UseOfflineMutationOptions<T, R>
): UseOfflineMutationResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    mutationFn,
    entity,
    operation,
    getEntityId,
    onOptimisticUpdate,
    onRollback,
    onSuccess,
    onError,
  } = options;

  const mutate = useCallback(
    async (payload: T) => {
      setIsLoading(true);
      setError(null);
      setIsOffline(false);

      try {
        const { result, mode } = await executeWithOfflineFallback({
          onlineAction: () => mutationFn(payload),
          entity,
          operation,
          entityId: getEntityId(payload),
          payload,
          optimisticUpdate: onOptimisticUpdate
            ? () => onOptimisticUpdate(payload)
            : undefined,
          rollback: onRollback ? () => onRollback(payload) : undefined,
        });

        if (mode === 'offline') {
          setIsOffline(true);
        }

        onSuccess?.(result, mode);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      mutationFn,
      entity,
      operation,
      getEntityId,
      onOptimisticUpdate,
      onRollback,
      onSuccess,
      onError,
    ]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsOffline(false);
    setError(null);
  }, []);

  return {
    mutate,
    isLoading,
    isOffline,
    error,
    reset,
  };
}

/**
 * Simplified hook for delete operations
 */
export function useOfflineDelete(
  entity: 'practice' | 'lineup' | 'assignment',
  deleteFn: (id: string) => Promise<void>,
  options?: {
    onOptimisticDelete?: (id: string) => Promise<void>;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  return useOfflineMutation<string, void>({
    mutationFn: deleteFn,
    entity,
    operation: 'delete',
    getEntityId: (id) => id,
    onOptimisticUpdate: options?.onOptimisticDelete,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
