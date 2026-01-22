---
phase: 05-regatta-mode
plan: 08
subsystem: ui
tags: [offline, indexeddb, pwa, react-hooks, caching]

# Dependency graph
requires:
  - phase: 05-regatta-mode (05-07)
    provides: useOfflineRegatta hook and regatta-cache.ts
provides:
  - Offline-first regatta detail page
  - Client-side data fetching with automatic IndexedDB caching
  - Seamless offline/online transition for regatta viewing
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Offline-first hook pattern for UI components
    - Server page passes identifiers, client fetches data

key-files:
  created: []
  modified:
    - src/app/(dashboard)/[teamSlug]/regattas/[id]/page.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/[id]/regatta-detail-client.tsx

key-decisions:
  - "Server page passes regattaId only, not full regatta object"
  - "Client component owns data fetching via useOfflineRegatta hook"
  - "Loading/error states handled at component level"

patterns-established:
  - "Offline-first page pattern: server validates access, client fetches via offline-aware hook"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 5 Plan 8: Offline Regatta Wiring Summary

**Wired useOfflineRegatta hook to regatta detail UI, enabling offline viewing with automatic IndexedDB caching**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-22T17:45:00Z
- **Completed:** 2026-01-22T17:53:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Server page simplified from 189 to 123 lines, passing only regattaId to client
- Client component now fetches data via useOfflineRegatta hook
- Data automatically cached to IndexedDB when online
- Cached data served when offline with staleness indicator
- Loading and error states properly handled

## Task Commits

Each task was committed atomically:

1. **Task 1: Update server page to pass only identifiers** - `55ceaaf` (refactor)
2. **Task 2: Wire useOfflineRegatta hook to client component** - `91f5038` (feat)
3. **Task 3: Verify offline flow end-to-end** - verification only, no commit needed

## Files Created/Modified

- `src/app/(dashboard)/[teamSlug]/regattas/[id]/page.tsx` - Simplified to pass only regattaId, removed full data fetching
- `src/app/(dashboard)/[teamSlug]/regattas/[id]/regatta-detail-client.tsx` - Now uses useOfflineRegatta hook for data

## Decisions Made

- **Server passes identifiers only:** Server component validates team access and renders static header, but does not pass full regatta data. This enables the client to handle offline scenarios.
- **Client owns data fetching:** useOfflineRegatta hook manages API fetching, caching, and offline fallback in one place.
- **Loading/error states at component level:** Client component renders appropriate states based on hook response.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Gap Closure

This plan closes the REG-08 requirement gap:

**Before:** Offline infrastructure existed (useOfflineRegatta hook, regatta-cache.ts) but UI received data from server props.

**After:**
- Server page passes only regattaId
- Client fetches via useOfflineRegatta(regattaId)
- Hook calls /api/regattas/[id] when online, caches to IndexedDB
- Hook returns cached data when offline
- StalenessIndicator shows actual cache state

**Data flow:**
```
Online:  page.tsx -> client.tsx -> useOfflineRegatta -> /api/regattas/[id] -> cacheRegatta() -> IndexedDB
Offline: page.tsx -> client.tsx -> useOfflineRegatta -> getCachedRegatta() -> IndexedDB
```

## Next Phase Readiness

- REG-08 requirement fully satisfied
- Phase 5 gap closure complete
- All Phase 5 requirements verified

---
*Phase: 05-regatta-mode*
*Completed: 2026-01-22*
