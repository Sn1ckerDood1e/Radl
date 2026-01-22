'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';

/**
 * Hook for tracking online/offline status with SSR support
 * Uses navigator.onLine and listens for online/offline events
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // Assume online during SSR
  return true;
}

/**
 * Hook that provides both online status and a manual check function
 */
export function useOnlineStatusWithCheck(): {
  isOnline: boolean;
  checkConnection: () => Promise<boolean>;
} {
  const isOnline = useOnlineStatus();

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }

    // Try a lightweight request to verify actual connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return { isOnline, checkConnection };
}
