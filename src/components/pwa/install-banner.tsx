'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallBannerProps {
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DISMISS_STORAGE_KEY = 'rowops-install-dismissed';
const DISMISS_DURATION_DAYS = 30;

// ============================================================================
// Install Banner Component
// ============================================================================

/**
 * PWA install banner component
 * - Listens for beforeinstallprompt event
 * - Bottom sheet placement
 * - Dismissible (stored in localStorage for 30 days)
 * - Doesn't show if already installed (standalone mode)
 * - Triggers native install prompt on Install click
 */
export function InstallBanner({ className = '' }: InstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Check if already installed or recently dismissed
  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) {
      return;
    }

    // Don't show if recently dismissed
    if (isDismissed()) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom banner
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event to hide banner
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the native install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        // User accepted, hide banner
        setIsVisible(false);
      } else {
        // User dismissed, mark as dismissed for 30 days
        saveDismissal();
        setIsVisible(false);
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install prompt failed:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    saveDismissal();
    setIsVisible(false);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
      role="banner"
      aria-label="Install app banner"
    >
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-start gap-4">
            {/* App icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <AppIcon className="w-7 h-7 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900">
                Install RowOps
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                Add to your home screen for quick access and offline features
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if app is running in standalone mode (installed PWA)
 */
function isStandalone(): boolean {
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
 * Check if user dismissed the banner recently
 */
function isDismissed(): boolean {
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
// Icons
// ============================================================================

function AppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
