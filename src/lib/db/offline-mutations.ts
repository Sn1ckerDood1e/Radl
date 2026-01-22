import { db, OfflineSchedule, OfflineLineup } from './schema';
import { queueMutation, processSyncQueue } from './sync-queue';

/**
 * Create an offline mutation that:
 * 1. Updates local IndexedDB immediately (optimistic update)
 * 2. Queues the change for sync
 * 3. Attempts immediate sync if online
 */
export async function createOfflineMutation<T>(options: {
  operation: 'create' | 'update' | 'delete';
  entity: 'practice' | 'lineup' | 'assignment';
  entityId: string;
  payload: T;
  optimisticUpdate?: () => Promise<void>;
  rollback?: () => Promise<void>;
}): Promise<{ queued: boolean; synced: boolean }> {
  const { operation, entity, entityId, payload, optimisticUpdate, rollback } =
    options;

  try {
    // Apply optimistic update to local storage
    if (optimisticUpdate) {
      await optimisticUpdate();
    }

    // Queue for background sync
    await queueMutation(operation, entity, entityId, payload);

    // Try immediate sync if online
    if (navigator.onLine) {
      try {
        const result = await processSyncQueue();
        return { queued: true, synced: result.processed > 0 };
      } catch (syncError) {
        console.warn('Immediate sync failed, will retry:', syncError);
        return { queued: true, synced: false };
      }
    }

    return { queued: true, synced: false };
  } catch (error) {
    // Rollback optimistic update on failure
    if (rollback) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    throw error;
  }
}

/**
 * Execute a mutation with offline fallback
 * Tries online first, falls back to queue if offline
 */
export async function executeWithOfflineFallback<T, R>(options: {
  // Online execution
  onlineAction: () => Promise<R>;
  // Offline queue params
  entity: 'practice' | 'lineup' | 'assignment';
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  payload: T;
  // Optimistic update
  optimisticUpdate?: () => Promise<void>;
  rollback?: () => Promise<void>;
}): Promise<{ result: R | null; mode: 'online' | 'offline' }> {
  const {
    onlineAction,
    entity,
    operation,
    entityId,
    payload,
    optimisticUpdate,
    rollback,
  } = options;

  // Apply optimistic update first
  if (optimisticUpdate) {
    await optimisticUpdate();
  }

  // Try online action
  if (navigator.onLine) {
    try {
      const result = await onlineAction();
      return { result, mode: 'online' };
    } catch (error: unknown) {
      // Network error - fall through to offline
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && error.message?.includes('fetch'));
      if (isNetworkError) {
        console.log('Network error, falling back to offline queue');
      } else {
        // Server error - rollback and throw
        if (rollback) await rollback();
        throw error;
      }
    }
  }

  // Offline - queue the mutation
  await queueMutation(operation, entity, entityId, payload);
  return { result: null, mode: 'offline' };
}

/**
 * Update a schedule in local storage (optimistic)
 */
export async function updateLocalSchedule(
  scheduleId: string,
  updates: Partial<OfflineSchedule>
): Promise<void> {
  await db.schedules.update(scheduleId, {
    ...updates,
    syncStatus: 'pending',
  });
}

/**
 * Delete a schedule from local storage (optimistic)
 */
export async function deleteLocalSchedule(scheduleId: string): Promise<void> {
  await db.schedules.delete(scheduleId);
}

/**
 * Update a lineup in local storage (optimistic)
 */
export async function updateLocalLineup(
  lineupId: string,
  updates: Partial<OfflineLineup>
): Promise<void> {
  await db.lineups.update(lineupId, {
    ...updates,
    syncStatus: 'pending',
  });
}
