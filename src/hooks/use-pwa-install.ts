'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface UsePwaInstallReturn {
  /** True if install prompt is available (Chromium browsers) */
  canInstall: boolean;
  /** True if running as installed PWA (standalone mode) */
  isInstalled: boolean;
  /** True if iOS device (needs manual Add to Home Screen instructions) */
  isIOS: boolean;
  /** True if user dismissed within 30 days */
  isDismissed: boolean;
  /** Trigger native install prompt. Returns outcome or null if no prompt available */
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
  /** Dismiss and set 30-day cooldown */
  dismiss: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DISMISS_STORAGE_KEY = 'radl-install-dismissed';
const DISMISS_DURATION_DAYS = 30;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if app is running in standalone mode (installed PWA)
 */
function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // iOS Safari check
  if ('standalone' in window.navigator) {
    return (window.navigator as { standalone?: boolean }).standalone === true;
  }

  return false;
}

/**
 * Check if device is iOS (no beforeinstallprompt support)
 */
function checkIsIOS(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for iOS devices, excluding IE/Edge mobile
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

/**
 * Check if user dismissed the banner recently (within cooldown period)
 */
function checkIsDismissed(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const dismissedStr = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!dismissedStr) return false;

    const dismissedDate = new Date(dismissedStr);
    const now = new Date();
    const daysSinceDismissal =
      (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceDismissal < DISMISS_DURATION_DAYS;
  } catch {
    return false;
  }
}

/**
 * Save dismissal timestamp to localStorage
 */
function saveDismissal(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, new Date().toISOString());
  } catch {
    // Ignore localStorage errors
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for PWA installation state and prompt handling
 *
 * Handles:
 * - Capturing beforeinstallprompt event (Chromium browsers)
 * - iOS device detection (no beforeinstallprompt support)
 * - Standalone mode detection (already installed)
 * - Dismiss state with 30-day cooldown via localStorage
 *
 * @example
 * ```tsx
 * const {
 *   canInstall,
 *   isInstalled,
 *   isIOS,
 *   isDismissed,
 *   promptInstall,
 *   dismiss
 * } = usePwaInstall();
 *
 * // Show banner if iOS or can install, and not dismissed/installed
 * const showBanner = (isIOS || canInstall) && !isInstalled && !isDismissed;
 * ```
 */
export function usePwaInstall(): UsePwaInstallReturn {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Store deferred prompt in ref to avoid re-renders
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Initialize state on mount
  useEffect(() => {
    setIsInstalled(checkIsStandalone());
    setIsIOS(checkIsIOS());
    setIsDismissed(checkIsDismissed());

    // Listen for beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Trigger native install prompt
   * @returns 'accepted' | 'dismissed' | null (null if no prompt available)
   */
  const promptInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | null
  > => {
    const deferredPrompt = deferredPromptRef.current;

    if (!deferredPrompt) {
      return null;
    }

    try {
      // Show the native install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'dismissed') {
        // User dismissed, set cooldown
        saveDismissal();
        setIsDismissed(true);
      }

      // Clear the deferred prompt (can only be used once)
      deferredPromptRef.current = null;
      setCanInstall(false);

      return outcome;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return null;
    }
  }, []);

  /**
   * Dismiss the install prompt and set 30-day cooldown
   */
  const dismiss = useCallback(() => {
    saveDismissal();
    setIsDismissed(true);
  }, []);

  return {
    canInstall,
    isInstalled,
    isIOS,
    isDismissed,
    promptInstall,
    dismiss,
  };
}
