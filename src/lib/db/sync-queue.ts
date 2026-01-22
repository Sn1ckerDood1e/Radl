import { db, SyncQueueItem } from './schema';

const MAX_RETRIES = 3;

/**
 * Add a mutation to the sync queue
 * Called when user makes a change (offline or online)
 */
export async function queueMutation(
  operation: SyncQueueItem['operation'],
  entity: SyncQueueItem['entity'],
  entityId: string,
  payload: unknown
): Promise<void> {
  await db.syncQueue.add({
    operation,
    entity,
    entityId,
    payload,
    timestamp: Date.now(),
    retries: 0,
  });

  // Attempt immediate sync if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processSyncQueue().catch(console.error);
  }
}

/**
 * Process all pending items in the sync queue
 * Called on:
 * - After queueMutation if online
 * - When online event fires
 * - On app startup
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  const items = await db.syncQueue.orderBy('timestamp').toArray();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const success = await syncItem(item);

      if (success) {
        await db.syncQueue.delete(item.id!);
        processed++;
      } else {
        // Increment retry count
        const newRetries = item.retries + 1;
        if (newRetries >= MAX_RETRIES) {
          // Move to failed state (keep in queue but stop retrying)
          // In production, might move to separate failed queue
          await db.syncQueue.delete(item.id!);
          failed++;
        } else {
          await db.syncQueue.update(item.id!, { retries: newRetries });
        }
      }
    } catch (error) {
      console.error('Sync failed for item:', item.id, error);
      const newRetries = item.retries + 1;
      if (newRetries >= MAX_RETRIES) {
        await db.syncQueue.delete(item.id!);
        failed++;
      } else {
        await db.syncQueue.update(item.id!, { retries: newRetries });
      }
    }
  }

  const remaining = await db.syncQueue.count();
  return { processed, failed, remaining };
}

/**
 * Sync a single queue item to the server
 */
async function syncItem(item: SyncQueueItem): Promise<boolean> {
  // Map entity to API endpoint
  const endpoints: Record<SyncQueueItem['entity'], string> = {
    practice: '/api/practices',
    lineup: '/api/lineups',
    assignment: '/api/lineups', // Assignments go through lineup API
  };

  const baseUrl = endpoints[item.entity];
  let url = baseUrl;
  let method: string;

  switch (item.operation) {
    case 'create':
      method = 'POST';
      break;
    case 'update':
      url = `${baseUrl}/${item.entityId}`;
      method = 'PATCH';
      break;
    case 'delete':
      url = `${baseUrl}/${item.entityId}`;
      method = 'DELETE';
      break;
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: item.operation !== 'delete' ? JSON.stringify(item.payload) : undefined,
  });

  if (response.ok) {
    return true;
  }

  // 4xx errors (client errors) - don't retry, data is bad
  if (response.status >= 400 && response.status < 500) {
    console.error('Client error syncing item, removing from queue:', response.status);
    return true; // Return true to remove from queue (won't succeed on retry)
  }

  // 5xx errors - server problem, should retry
  return false;
}

/**
 * Clear all items from sync queue (use with caution)
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

/**
 * Get all pending sync items (for debugging/display)
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('timestamp').toArray();
}

// Register online listener to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Online detected, processing sync queue...');
    processSyncQueue()
      .then((result) => console.log('Sync complete:', result))
      .catch(console.error);
  });
}
