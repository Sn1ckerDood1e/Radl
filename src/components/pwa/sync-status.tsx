'use client';

import { useState } from 'react';
import { useSyncQueueCount } from '@/lib/db/hooks';
import { processSyncQueue } from '@/lib/db/sync-queue';

interface SyncStatusProps {
  className?: string;
}

/**
 * Shows sync queue status with pending count and manual sync button
 * Only visible when there are pending items
 */
export function SyncStatus({ className = '' }: SyncStatusProps) {
  const pendingCount = useSyncQueueCount();
  const [isSyncing, setIsSyncing] = useState(false);

  if (pendingCount === 0) {
    return null;
  }

  const handleSync = async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    try {
      await processSyncQueue();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="text-amber-700">
          {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}
        </span>
      </span>

      {isOnline && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {isSyncing ? 'Syncing...' : 'Sync now'}
        </button>
      )}

      {!isOnline && (
        <span className="text-gray-500">(waiting for connection)</span>
      )}
    </div>
  );
}

/**
 * Compact version for header placement
 */
export function SyncStatusBadge() {
  const pendingCount = useSyncQueueCount();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-amber-500 rounded-full"
      title={`${pendingCount} pending changes`}
    >
      {pendingCount > 9 ? '9+' : pendingCount}
    </span>
  );
}
