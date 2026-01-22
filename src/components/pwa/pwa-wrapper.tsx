'use client';

import { type ReactNode } from 'react';
import { OfflineProvider } from './offline-indicator';
import { InstallBanner } from './install-banner';

interface PWAWrapperProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for PWA features
 * - OfflineProvider for offline error handling context
 * - InstallBanner for PWA installation prompt
 *
 * Used in dashboard layout since layout.tsx is a server component
 */
export function PWAWrapper({ children }: PWAWrapperProps) {
  return (
    <OfflineProvider>
      {children}
      <InstallBanner />
    </OfflineProvider>
  );
}
