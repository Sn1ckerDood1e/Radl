'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ADMIN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Admin session timeout component.
 * Signs out user after 30 minutes of inactivity.
 *
 * Activity events that reset the timer:
 * - mousedown, keydown, touchstart, scroll, mousemove
 *
 * AUTH-03 compliance: Admin session expires after 30 minutes of inactivity.
 */
export function AdminSessionTimeout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleTimeout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login?timeout=admin');
  }, [router]);

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(handleTimeout, ADMIN_TIMEOUT_MS);
  }, [handleTimeout]);

  useEffect(() => {
    // Activity events to track
    const activityEvents = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'mousemove',
    ];

    // Throttle activity detection to avoid excessive resets
    let lastReset = 0;
    const throttledReset = () => {
      const now = Date.now();
      // Only reset if more than 1 second since last reset
      if (now - lastReset > 1000) {
        lastReset = now;
        resetTimeout();
      }
    };

    // Add listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledReset, { passive: true });
    });

    // Start initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout]);

  // Also check on visibility change (tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we should have timed out while tab was hidden
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= ADMIN_TIMEOUT_MS) {
          handleTimeout();
        } else {
          // Tab became visible, reset timeout for remaining time
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(
            handleTimeout,
            ADMIN_TIMEOUT_MS - elapsed
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleTimeout]);

  // This component renders nothing - it's just for the side effect
  return null;
}
