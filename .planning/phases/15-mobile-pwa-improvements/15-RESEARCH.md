# Phase 15: Mobile PWA Improvements - Research

**Researched:** 2026-01-23
**Domain:** Mobile PWA, Gestures, Offline-First Architecture
**Confidence:** HIGH (verified with official docs and existing codebase)

## Summary

This phase enhances the existing PWA infrastructure to deliver a native-app-quality mobile experience. The project already has substantial offline infrastructure in place (Dexie.js IndexedDB, sync queue, offline mutations), so this phase focuses on polishing the UX: swipe gestures, bottom sheets, network indicators, and view transitions.

Key findings:
- **Swipe gestures:** @use-gesture/react is the standard choice. Already planned in STATE.md. The library provides swipe detection out of the box with configurable thresholds.
- **Bottom sheets:** shadcn/ui's Drawer component (built on Vaul) is the standard choice and integrates seamlessly with the existing component library.
- **Offline sync:** The existing infrastructure is well-designed; this phase needs to enhance the network status indicator and add visual sync state to the header.
- **View transitions:** Next.js 16 has experimental support via `experimental.viewTransition`. This is production-ready enough for subtle cross-fades but complex transitions should be deferred.
- **PWA install:** `beforeinstallprompt` works on Chromium; iOS requires manual Add to Home Screen instructions.

**Primary recommendation:** Use the existing shadcn/ui and Dexie.js patterns. Add @use-gesture/react for swipes and shadcn Drawer (Vaul) for bottom sheets. Enable view transitions experimentally.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @use-gesture/react | ^10.3 | Touch gesture handling | pmndrs ecosystem, works with react-spring, proven mobile support |
| vaul | ^1.1.2 | Bottom sheet/drawer | Official shadcn/ui Drawer uses this, maintained by Emil Kowalski |
| dexie | ^4.2.1 | IndexedDB abstraction | Already in project, best-in-class for offline-first |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-spring/web | ^9.7 | Animation for gestures | Optional: smoother swipe animations |

### Already Installed
| Library | Version | Purpose |
|---------|---------|---------|
| dexie | ^4.2.1 | IndexedDB - already set up |
| dexie-react-hooks | ^4.2.0 | React bindings for Dexie |
| @serwist/next | ^9.5.0 | Service worker - already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @use-gesture/react | react-swipeable | Simpler API but less configurable; @use-gesture better for complex gestures |
| vaul | react-modal-sheet | Vaul is what shadcn/ui uses natively; no reason to add another |
| custom sync | Dexie Cloud | Already have custom sync; Dexie Cloud adds cost and complexity |

**Installation:**
```bash
npm install @use-gesture/react vaul
npx shadcn@latest add drawer
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/
│   │   └── drawer.tsx          # shadcn Drawer (to be added)
│   ├── mobile/
│   │   ├── swipeable-list-item.tsx   # Reusable swipe-to-action component
│   │   ├── bottom-sheet-menu.tsx     # Mobile context menu wrapper
│   │   └── pwa-install-prompt.tsx    # Install banner component
│   └── pwa/
│       ├── offline-indicator.tsx     # EXISTING - enhance
│       ├── sync-status.tsx           # Header network/sync indicator
│       └── register-sw.tsx           # EXISTING
├── hooks/
│   ├── use-online-status.ts      # EXISTING
│   ├── use-offline-mutation.ts   # EXISTING
│   ├── use-swipe-gesture.ts      # New: wrapper for @use-gesture
│   ├── use-pwa-install.ts        # New: beforeinstallprompt handling
│   └── use-sync-status.ts        # New: pending/syncing/error state
└── lib/db/
    ├── sync-queue.ts             # EXISTING - already handles queue
    ├── schema.ts                 # EXISTING
    └── offline-mutations.ts      # EXISTING
```

### Pattern 1: Swipeable List Item
**What:** A wrapper component that makes any list item swipeable with reveal actions
**When to use:** All mobile list views (practices, equipment, roster, lineups)
**Example:**
```typescript
// Source: @use-gesture/react documentation
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;  // Delete action
  onSwipeRight?: () => void; // Edit action
  leftAction?: React.ReactNode;  // Red delete reveal
  rightAction?: React.ReactNode; // Blue edit reveal
}

export function SwipeableListItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
}: SwipeableListItemProps) {
  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  const bind = useDrag(
    ({ movement: [mx], swipe: [swipeX], down, cancel }) => {
      if (swipeX === -1) {
        onSwipeLeft?.();
        api.start({ x: 0 });
      } else if (swipeX === 1) {
        onSwipeRight?.();
        api.start({ x: 0 });
      } else if (!down) {
        api.start({ x: 0 });
      } else {
        api.start({ x: mx, immediate: down });
      }
    },
    {
      axis: 'x',
      bounds: { left: -100, right: 100 },
      rubberband: true,
      swipe: {
        distance: 50,  // min pixels to trigger swipe
        velocity: 0.3, // min velocity (px/ms)
        duration: 250, // max duration for swipe
      },
    }
  );

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-y-0 left-0 w-24 bg-blue-500 flex items-center justify-center">
        {rightAction}
      </div>
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center">
        {leftAction}
      </div>

      {/* Swipeable content */}
      <animated.div
        {...bind()}
        style={{ x, touchAction: 'pan-y' }}
        className="relative bg-background"
      >
        {children}
      </animated.div>
    </div>
  );
}
```

### Pattern 2: Responsive Bottom Sheet
**What:** Context menus that render as dropdown on desktop, bottom sheet on mobile
**When to use:** All context menus, action menus on mobile
**Example:**
```typescript
// Source: shadcn/ui Drawer + responsive pattern
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ResponsiveMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export function ResponsiveMenu({ trigger, children }: ResponsiveMenuProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <div className="p-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Pattern 3: PWA Install Prompt Hook
**What:** Hook to capture and manage the beforeinstallprompt event
**When to use:** For showing install prompts to eligible users
**Example:**
```typescript
// Source: MDN PWA documentation
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS (no beforeinstallprompt)
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Chromium only)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    setInstallPrompt(null);
    return outcome === 'accepted';
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt,
    isInstalled,
    isIOS,
    promptInstall,
  };
}
```

### Pattern 4: Sync Status Hook
**What:** Hook that tracks pending mutations, sync state, and network status
**When to use:** For the network indicator in header
**Example:**
```typescript
// Build on existing infrastructure
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { useOnlineStatus } from '@/hooks/use-online-status';

type SyncState = 'idle' | 'pending' | 'syncing' | 'error';

export function useSyncStatus() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingCount = useLiveQuery(
    () => db.syncQueue.count(),
    [],
    0
  );

  const state: SyncState = useMemo(() => {
    if (!isOnline) return 'idle'; // Can't sync offline
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    return 'idle';
  }, [isOnline, isSyncing, pendingCount]);

  return {
    isOnline,
    state,
    pendingCount,
    hasPending: pendingCount > 0,
  };
}
```

### Anti-Patterns to Avoid
- **Don't use touch-action: none globally:** Only on swipeable elements. Use `preventScroll` option instead for better scroll coexistence.
- **Don't show install prompt immediately:** Wait for user engagement (e.g., after 2nd visit or after completing an action).
- **Don't animate everything:** View transitions should be subtle cross-fades only. Complex animations hurt perceived performance.
- **Don't poll for online status:** Use `navigator.onLine` with event listeners, already done in existing `useOnlineStatus` hook.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture detection | Custom touch event handling | @use-gesture/react | Handles velocity, direction, thresholds, cancellation, edge cases |
| Bottom sheet drawer | Custom animated div | vaul (via shadcn Drawer) | Handles snap points, backdrop, escape, scroll locking, accessibility |
| IndexedDB queries | Manual IndexedDB API | Dexie.js (already installed) | Already have full schema and queries |
| Service worker | Manual SW | Serwist (already configured) | Already handles precaching, runtime caching, offline page |
| Online/offline detection | Custom polling | Existing useOnlineStatus hook | Already handles SSR, events properly |

**Key insight:** The project already has most offline infrastructure. This phase is about UX polish, not rebuilding. Focus on the gesture and UI layer.

## Common Pitfalls

### Pitfall 1: Touch Scroll Conflicts
**What goes wrong:** Swipe gestures interfere with page scrolling on mobile
**Why it happens:** Both gestures and scroll want to capture vertical/horizontal touches
**How to avoid:**
- Use `axis: 'x'` to only capture horizontal drags
- Add `touch-action: pan-y` to swipeable elements (allows vertical scroll)
- Use `preventScroll: true` with delay only when needed
**Warning signs:** Page doesn't scroll on mobile; swipe feels laggy

### Pitfall 2: iOS PWA Install Prompt
**What goes wrong:** Showing "Install app" button that does nothing on iOS
**Why it happens:** `beforeinstallprompt` only fires on Chromium browsers
**How to avoid:**
- Detect iOS with user agent check
- Show manual instructions: "Tap Share, then 'Add to Home Screen'"
- Use different UI for iOS vs Android
**Warning signs:** Install button appears on Safari, nothing happens on tap

### Pitfall 3: View Transitions Performance
**What goes wrong:** Page transitions feel janky, especially on low-end devices
**Why it happens:** Complex animations + DOM updates compete for main thread
**How to avoid:**
- Use simple cross-fade (browser default)
- Don't animate large images or lists
- Test on throttled CPU in DevTools
- Consider deferring to v2.1 if problematic
**Warning signs:** Stutter during navigation, FPS drops in DevTools

### Pitfall 4: Bottom Sheet Z-Index Conflicts
**What goes wrong:** Dialogs, toasts, or other overlays appear behind bottom sheet
**Why it happens:** Multiple portal containers with competing z-index
**How to avoid:**
- Use consistent z-index scale (existing in Tailwind config likely)
- Vaul uses radix-ui which handles focus trapping
- Test with multiple overlays open
**Warning signs:** Can't dismiss sheet, wrong element has focus

### Pitfall 5: Sync Queue Starvation
**What goes wrong:** Pending mutations never sync, even when online
**Why it happens:** Errors cause items to pile up in queue
**How to avoid:**
- Existing queue already has MAX_RETRIES = 3
- 4xx errors (client errors) are already removed, not retried
- Add visibility into queue state for debugging
**Warning signs:** pendingCount keeps growing, sync never completes

## Code Examples

### View Transitions Setup
```typescript
// next.config.ts
// Source: Next.js 16 documentation
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const revision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,  // Enable view transitions
  },
};

export default withSerwist(nextConfig);
```

### Drawer Component (shadcn)
```typescript
// components/ui/drawer.tsx
// Source: shadcn/ui drawer component
"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerPortal = DrawerPrimitive.Portal
const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = "DrawerContent"

// ... DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription exports
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
}
```

### Network Status Indicator
```typescript
// components/pwa/sync-status.tsx
// Builds on existing offline-indicator.tsx
'use client';

import { useSyncStatus } from '@/hooks/use-sync-status';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncStatusIndicator() {
  const { isOnline, state, pendingCount } = useSyncStatus();

  // Hide when everything is good
  if (isOnline && state === 'idle') {
    return null;
  }

  return (
    <button
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm",
        !isOnline && "bg-amber-100 text-amber-800",
        state === 'pending' && "bg-blue-100 text-blue-800 animate-pulse",
        state === 'syncing' && "bg-blue-100 text-blue-800",
        state === 'error' && "bg-red-100 text-red-800"
      )}
      aria-label={
        !isOnline ? "You're offline" :
        state === 'pending' ? `${pendingCount} changes pending` :
        state === 'syncing' ? 'Syncing...' :
        'Sync error'
      }
    >
      {!isOnline ? (
        <CloudOff className="w-4 h-4" />
      ) : state === 'syncing' ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : state === 'error' ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <Cloud className="w-4 h-4" />
      )}

      {!isOnline ? 'Offline' :
       state === 'pending' ? pendingCount :
       state === 'syncing' ? 'Syncing' :
       'Error'}
    </button>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom touch handlers | @use-gesture/react | 2022+ | Much simpler, battle-tested |
| Modal dialogs on mobile | Bottom sheets (vaul) | 2023+ | Better mobile UX |
| Page reloads | View Transitions API | 2024+ (Chrome), 2025+ (Next.js) | App-like feel |
| Polling for online status | Navigator events + useSyncExternalStore | React 18+ | More reliable, less battery |

**Deprecated/outdated:**
- `react-swipe-events`: Unmaintained, use @use-gesture/react instead
- `react-bottom-sheet`: Less active than vaul, which is shadcn standard
- Manual service worker: Use Serwist (already in project)

## Open Questions

Things that couldn't be fully resolved:

1. **View transitions stability**
   - What we know: Next.js 16 has `experimental.viewTransition` flag that works
   - What's unclear: How stable is it for production? What edge cases exist?
   - Recommendation: Enable it, use simple cross-fade only, disable if issues arise

2. **Vaul maintenance status**
   - What we know: Creator marked repo as "unmaintained" in 2025
   - What's unclear: Will shadcn/ui fork or find new maintainer?
   - Recommendation: Use it anyway - it works, shadcn/ui depends on it, community will maintain

3. **Optimal swipe thresholds**
   - What we know: Default is 50px distance, 0.5px/ms velocity
   - What's unclear: Best values for this specific app on various devices
   - Recommendation: Start with defaults, tune based on user feedback

## Sources

### Primary (HIGH confidence)
- [@use-gesture/react documentation](https://use-gesture.netlify.app/) - gesture state, options, swipe detection
- [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/drawer) - installation and usage
- [Vaul documentation](https://vaul.emilkowal.ski/) - snap points, API reference
- [Next.js viewTransition docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) - configuration
- [MDN PWA Install Prompt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt) - beforeinstallprompt pattern

### Secondary (MEDIUM confidence)
- [Next.js 16 Blog](https://nextjs.org/blog/next-16) - view transitions announcement
- [Vaul GitHub](https://github.com/emilkowalski/vaul) - API props, version 1.1.2
- [Dexie Best Practices](https://dexie.org/docs/Tutorial/Best-Practices) - sync patterns

### Tertiary (LOW confidence)
- WebSearch results for PWA iOS limitations - confirmed via MDN

## Metadata

**Confidence breakdown:**
- Swipe gestures: HIGH - @use-gesture is well-documented, patterns verified
- Bottom sheets: HIGH - shadcn/ui officially uses Vaul
- Offline sync: HIGH - codebase already has working implementation
- View transitions: MEDIUM - experimental flag, but officially documented
- PWA install: HIGH - browser API well-documented, iOS limitations known

**Research date:** 2026-01-23
**Valid until:** ~2026-03-23 (60 days - stable domain, libraries are mature)
