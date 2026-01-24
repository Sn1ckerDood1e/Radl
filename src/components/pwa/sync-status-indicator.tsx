'use client';

import { Cloud, CloudOff, RefreshCw, AlertCircle, X } from 'lucide-react';
import { useSyncStatus, type SyncState } from '@/hooks/use-sync-status';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Visual configuration for each sync state
 */
const stateConfig: Record<SyncState, {
  icon: typeof Cloud;
  label: string;
  bgClass: string;
  textClass: string;
  animate?: string;
}> = {
  online: {
    icon: Cloud,
    label: 'Connected',
    bgClass: '',
    textClass: '',
  },
  offline: {
    icon: CloudOff,
    label: 'Offline',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-800 dark:text-amber-200',
  },
  pending: {
    icon: Cloud,
    label: 'Pending',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-200',
    animate: 'animate-pulse',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-200',
  },
  error: {
    icon: AlertCircle,
    label: 'Sync failed',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-200',
  },
};

/**
 * Header-integrated network status indicator
 *
 * Design requirements:
 * - Hidden when online and no pending changes (state === 'online')
 * - Show when: offline, syncing, pending changes, sync error
 * - Subtle pulse animation when pending changes
 * - Tappable only when issues exist (shows sync queue info, retry option)
 *
 * Compact for header placement (h-8 max)
 */
export function SyncStatusIndicator() {
  const {
    state,
    pendingCount,
    hasError,
    lastError,
    triggerSync,
    clearError,
    isOnline,
  } = useSyncStatus();

  // Hide when online with no pending changes
  if (state === 'online') {
    return null;
  }

  const config = stateConfig[state];
  const Icon = config.icon;
  const isSyncing = state === 'syncing';

  // Status message for dropdown
  const getStatusMessage = () => {
    switch (state) {
      case 'offline':
        return 'You are currently offline. Changes will sync when you reconnect.';
      case 'pending':
        return `You have ${pendingCount} pending ${pendingCount === 1 ? 'change' : 'changes'} to sync.`;
      case 'syncing':
        return 'Syncing your changes...';
      case 'error':
        return lastError || 'Some changes failed to sync.';
      default:
        return '';
    }
  };

  const indicator = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm font-medium transition-colors',
        config.bgClass,
        config.textClass,
        config.animate,
        'cursor-pointer hover:opacity-80'
      )}
    >
      <Icon
        className={cn('h-4 w-4', isSyncing && 'animate-spin')}
        aria-hidden="true"
      />
      <span className="sr-only md:not-sr-only">{config.label}</span>
      {state === 'pending' && pendingCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-semibold bg-blue-600 text-white rounded-full">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label={`Sync status: ${config.label}`}
        >
          {indicator}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Icon
            className={cn('h-4 w-4', config.textClass, isSyncing && 'animate-spin')}
          />
          <span>{config.label}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Status message */}
        <div className="px-2 py-2 text-sm text-muted-foreground">
          {getStatusMessage()}
        </div>

        {/* Pending count when in pending or error state */}
        {pendingCount > 0 && state !== 'syncing' && (
          <div className="px-2 py-1 text-sm">
            <span className="text-muted-foreground">Pending changes: </span>
            <span className="font-medium">{pendingCount}</span>
          </div>
        )}

        {/* Error message detail */}
        {hasError && lastError && (
          <div className="px-2 py-1">
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {lastError}
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        {/* Action buttons */}
        <div className="p-2 flex gap-2">
          {isOnline && !isSyncing && pendingCount > 0 && (
            <Button
              size="sm"
              variant="default"
              onClick={triggerSync}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4" />
              Retry sync
            </Button>
          )}
          {hasError && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearError}
              className={cn(!isOnline || pendingCount === 0 ? 'flex-1' : '')}
            >
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          )}
          {!isOnline && (
            <div className="flex-1 text-center text-sm text-muted-foreground py-1">
              Waiting for connection...
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
