'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  getNotificationPermission,
} from '@/lib/push/subscribe';

type PermissionState = NotificationPermission | 'unsupported' | 'loading';
type SubscriptionState = 'subscribed' | 'unsubscribed' | 'loading' | 'error';

/**
 * NotificationSettings component for managing push notification preferences.
 * Shows permission state, subscription toggle, and notification info.
 */
export function NotificationSettings() {
  const [permissionState, setPermissionState] = useState<PermissionState>('loading');
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Check current state on mount
  useEffect(() => {
    async function checkState() {
      // Check if push is supported
      if (!isPushSupported()) {
        setPermissionState('unsupported');
        setSubscriptionState('unsubscribed');
        return;
      }

      // Get current permission
      const permission = getNotificationPermission();
      setPermissionState(permission || 'unsupported');

      // Check current subscription
      try {
        const subscription = await getCurrentSubscription();
        setSubscriptionState(subscription ? 'subscribed' : 'unsubscribed');
      } catch {
        setSubscriptionState('error');
        setError('Failed to check notification status');
      }
    }

    checkState();
  }, []);

  const handleToggle = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    setError(null);

    try {
      if (subscriptionState === 'subscribed') {
        // Unsubscribe
        await unsubscribeFromPush();
        setSubscriptionState('unsubscribed');
      } else {
        // Subscribe (will request permission if needed)
        await subscribeToPush();
        setSubscriptionState('subscribed');
        setPermissionState('granted');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update notification settings';
      setError(message);

      // Update permission state if denied
      if (message.includes('denied')) {
        setPermissionState('denied');
      }
    } finally {
      setIsToggling(false);
    }
  }, [subscriptionState, isToggling]);

  const isEnabled = subscriptionState === 'subscribed';
  const canToggle = permissionState !== 'unsupported' && permissionState !== 'loading';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-300">Push Notifications</h3>
          <p className="text-sm text-zinc-500 mt-0.5">
            Receive alerts about schedule changes and assignments
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          disabled={!canToggle || isToggling}
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900
            ${!canToggle || isToggling ? 'cursor-not-allowed opacity-50' : ''}
            ${isEnabled ? 'bg-emerald-600' : 'bg-zinc-700'}
          `}
        >
          <span className="sr-only">Enable push notifications</span>
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Status Messages */}
      {permissionState === 'unsupported' && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <UnsupportedIcon className="h-4 w-4" />
          <span>Push notifications are not supported in this browser</span>
        </div>
      )}

      {permissionState === 'denied' && (
        <div className="flex items-start gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <BlockedIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Notifications blocked</p>
            <p className="text-amber-400 mt-0.5">
              To enable notifications, click the lock icon in your browser's address bar and allow notifications for this site.
            </p>
          </div>
        </div>
      )}

      {error && permissionState !== 'denied' && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <ErrorIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {isToggling && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <LoadingSpinner className="h-4 w-4" />
          <span>{subscriptionState === 'subscribed' ? 'Disabling...' : 'Enabling...'}</span>
        </div>
      )}

      {/* Info about what notifications are sent */}
      {canToggle && (
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <p className="text-xs text-zinc-500 mb-2">You'll receive notifications for:</p>
          <ul className="text-xs text-zinc-500 space-y-1">
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              <span>Lineup assignments</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              <span>Practice schedule changes</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-3 w-3 text-emerald-500" />
              <span>Practice cancellations</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Icon components
function UnsupportedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function BlockedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
