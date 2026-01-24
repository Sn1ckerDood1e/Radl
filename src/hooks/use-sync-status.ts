'use client';

import { useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSyncQueueCount } from '@/lib/db/hooks';
import { processSyncQueue } from '@/lib/db/sync-queue';

/**
 * Sync state representing the current connectivity and sync status
 */
export type SyncState = 'online' | 'offline' | 'pending' | 'syncing' | 'error';

/**
 * Result of useSyncStatus hook
 */
export interface SyncStatusResult {
  /** Whether the browser has network connectivity */
  isOnline: boolean;
  /** Current sync state: online, offline, pending, syncing, or error */
  state: SyncState;
  /** Number of pending mutations in the sync queue */
  pendingCount: number;
  /** Whether there are pending mutations to sync */
  hasPending: boolean;
  /** Whether there was an error during the last sync attempt */
  hasError: boolean;
  /** Error message from the last failed sync, if any */
  lastError: string | null;
  /** Manually trigger sync queue processing */
  triggerSync: () => Promise<void>;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook that combines online status, sync queue state, and sync operations
 *
 * Provides a unified view of:
 * - Network connectivity status
 * - Pending offline mutations count
 * - Active sync status
 * - Error state from failed syncs
 *
 * State priority (first matching wins):
 * 1. offline - if not connected to network
 * 2. syncing - if actively syncing
 * 3. error - if last sync failed
 * 4. pending - if has queued mutations
 * 5. online - everything is good
 */
export function useSyncStatus(): SyncStatusResult {
  const isOnline = useOnlineStatus();
  const pendingCount = useSyncQueueCount();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Compute current state based on priority
  const state: SyncState = (() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (hasError) return 'error';
    if (pendingCount > 0) return 'pending';
    return 'online';
  })();

  const hasPending = pendingCount > 0;

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setHasError(false);
    setLastError(null);

    try {
      const result = await processSyncQueue();

      // If any items failed, set error state
      if (result.failed > 0) {
        setHasError(true);
        setLastError(`${result.failed} ${result.failed === 1 ? 'change' : 'changes'} failed to sync`);
      }
    } catch (error) {
      setHasError(true);
      setLastError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  const clearError = useCallback(() => {
    setHasError(false);
    setLastError(null);
  }, []);

  return {
    isOnline,
    state,
    pendingCount,
    hasPending,
    hasError,
    lastError,
    triggerSync,
    clearError,
  };
}
