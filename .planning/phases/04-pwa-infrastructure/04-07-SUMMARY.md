---
phase: 04-pwa-infrastructure
plan: 07
subsystem: pwa
tags: [pwa, install-prompt, offline-indicator, online-status, hooks]

# Dependency graph
requires:
  - phase: 04-01
    provides: Service worker infrastructure
  - phase: 04-03
    provides: Offline data sync with cache manager
provides:
  - useOnlineStatus hook for tracking connectivity
  - OfflineProvider and OfflineIndicator for offline error UX
  - InstallBanner for PWA installation prompt
  - PWAWrapper for dashboard integration
affects: [05-regatta-mode, offline-features, mobile-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [online-status-hook, offline-error-context, install-prompt-interception]

key-files:
  created:
    - src/hooks/use-online-status.ts
    - src/components/pwa/offline-indicator.tsx
    - src/components/pwa/install-banner.tsx
    - src/components/pwa/pwa-wrapper.tsx
  modified:
    - src/app/(dashboard)/layout.tsx

key-decisions:
  - "useSyncExternalStore for SSR-safe online status tracking"
  - "30-day localStorage dismissal prevents install banner nagging"
  - "PWAWrapper client component enables server component layout integration"
  - "Offline errors show retry button only when back online"

patterns-established:
  - "Online status hook: useSyncExternalStore with navigator.onLine and event listeners"
  - "Install banner: Intercept beforeinstallprompt, store deferred prompt, trigger on user action"
  - "Offline context: Provider pattern with show/dismiss/retry error management"
  - "PWA integration: Client wrapper component for server component layouts"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 4 Plan 7: Install UX and Offline Indicator Summary

**useOnlineStatus hook, OfflineProvider context with error indicators, and InstallBanner for non-intrusive PWA installation prompts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T02:24:01Z
- **Completed:** 2026-01-22T02:27:26Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Online status tracking with SSR support via useSyncExternalStore
- Offline error context with show/dismiss/retry functionality
- PWA install banner with 30-day dismissal persistence
- Dashboard layout integration via client wrapper component

## Task Commits

Each task was committed atomically:

1. **Task 1: Create online status hook and offline indicator** - `3e3d449` (feat)
2. **Task 2: Create install banner component** - `afebc08` (feat)
3. **Task 3: Integrate into dashboard layout** - `6e48e71` (feat)

## Files Created/Modified
- `src/hooks/use-online-status.ts` - useOnlineStatus hook with SSR support, useOnlineStatusWithCheck for manual verification
- `src/components/pwa/offline-indicator.tsx` - OfflineProvider context, useOfflineIndicator hook, useOfflineAction wrapper, OfflineIndicator UI
- `src/components/pwa/install-banner.tsx` - InstallBanner with beforeinstallprompt interception, localStorage dismissal
- `src/components/pwa/pwa-wrapper.tsx` - Client wrapper combining OfflineProvider and InstallBanner
- `src/app/(dashboard)/layout.tsx` - Added PWAWrapper wrapping dashboard content

## Decisions Made
- **useSyncExternalStore for online status:** Modern React pattern that handles SSR correctly (returns true on server, syncs with navigator.onLine on client)
- **30-day dismissal persistence:** Prevents annoying users while still allowing re-prompting after reasonable time
- **PWAWrapper client component:** Server component layout.tsx cannot directly render client components with hooks, wrapper solves this cleanly
- **Offline errors with retry:** Errors store retryFn callback, show Retry button only when connection restored

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 PWA Infrastructure complete (7/7 plans)
- Service worker, offline data, push notifications, and install UX all operational
- Ready for Phase 5: Regatta Mode
- App shell loads from cache, offline failures show clear indicators, install prompt appears on first visit

---
*Phase: 04-pwa-infrastructure*
*Completed: 2026-01-22*
