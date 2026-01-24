'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for detecting media query matches with SSR support
 *
 * @param query - Media query string (e.g., "(max-width: 767px)")
 * @returns boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isSmall = useMediaQuery('(max-width: 640px)');
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  // Default to false for SSR - prevents hydration mismatch
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create listener for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener (addEventListener is supported in all modern browsers)
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook for detecting mobile viewport
 * Mobile is defined as viewport width < 768px (below md breakpoint)
 *
 * @returns boolean indicating if viewport is mobile-sized
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileComponent /> : <DesktopComponent />;
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
