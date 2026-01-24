'use client';

import { useState, useCallback } from 'react';
import { usePwaInstall } from '@/hooks/use-pwa-install';

// ============================================================================
// Types
// ============================================================================

interface InstallBannerProps {
  className?: string;
}

// ============================================================================
// Install Banner Component
// ============================================================================

/**
 * PWA install banner component
 * - Uses usePwaInstall hook for install state management
 * - Shows native install prompt for Chromium browsers
 * - Shows manual Add to Home Screen instructions for iOS
 * - Bottom sheet placement with dismissible behavior
 * - Respects 30-day dismiss cooldown
 */
export function InstallBanner({ className = '' }: InstallBannerProps) {
  const {
    canInstall,
    isInstalled,
    isIOS,
    isDismissed,
    promptInstall,
    dismiss,
  } = usePwaInstall();

  const [isInstalling, setIsInstalling] = useState(false);

  // Determine if banner should be visible
  const isVisible = !isInstalled && !isDismissed && (isIOS || canInstall);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);

    try {
      const outcome = await promptInstall();

      if (outcome === 'accepted') {
        // User accepted, banner will hide via isInstalled state
      }
      // If dismissed, the hook already handles the cooldown
    } catch (error) {
      console.error('Install prompt failed:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom ${className}`}
      role="banner"
      aria-label="Install app banner"
    >
      <div className="bg-white border-t border-gray-200 shadow-lg dark:bg-zinc-900 dark:border-zinc-700">
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
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Install RowOps
              </h3>

              {isIOS ? (
                // iOS-specific instructions
                <IOSInstructions />
              ) : (
                // Standard description for Chromium browsers
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  Add to your home screen for quick access and offline features
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mt-3">
                {isIOS ? (
                  // iOS: "Got it" button that dismisses
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Got it
                  </button>
                ) : (
                  // Chromium: "Install" button that triggers native prompt
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isInstalling ? 'Installing...' : 'Install'}
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
// iOS Instructions Component
// ============================================================================

function IOSInstructions() {
  return (
    <div className="mt-2">
      <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <li className="flex items-center gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-200">
            1
          </span>
          <span className="flex items-center gap-1.5">
            Tap the
            <ShareIcon className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Share</span> button
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-200">
            2
          </span>
          <span className="flex items-center gap-1.5">
            Scroll and tap
            <AddBoxIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium">Add to Home Screen</span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-200">
            3
          </span>
          <span>
            Tap <span className="font-medium">Add</span> to install
          </span>
        </li>
      </ol>
    </div>
  );
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

/**
 * iOS Share icon (box with up arrow)
 */
function ShareIcon({ className }: { className?: string }) {
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
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

/**
 * Add to Home Screen icon (plus in box)
 */
function AddBoxIcon({ className }: { className?: string }) {
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
        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
