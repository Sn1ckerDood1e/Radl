---
phase: 05-regatta-mode
plan: 07
subsystem: pwa
tags: [dexie, indexeddb, offline, cache, regatta]

# Dependency graph
requires:
  - phase: 04-pwa-infrastructure
    provides: Dexie schema, cache-manager patterns, staleness-indicator
  - phase: 05-regatta-mode/05-05
    provides: Regatta detail UI with timeline
provides:
  - OfflineRegatta and OfflineEntry interfaces in Dexie schema
  - Regatta cache manager with cache/get/clear operations
  - useOfflineRegatta hook for offline-capable data fetching
  - Offline indicator and staleness display in regatta UI
affects: [offline-sync, regatta-mutations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dexie schema versioning for migrations"
    - "Denormalized offline data for display without joins"
    - "Online/offline fallback with automatic caching"

key-files:
  created:
    - src/lib/db/regatta-cache.ts
    - src/hooks/use-offline-regatta.ts
  modified:
    - src/lib/db/schema.ts
    - src/app/(dashboard)/[teamSlug]/regattas/[id]/regatta-detail-client.tsx
    - src/app/(dashboard)/[teamSlug]/regattas/[id]/page.tsx

key-decisions:
  - "Denormalized lineup in OfflineEntry for display without joins"
  - "Version 2 schema with compound indexes for regatta queries"
  - "24-hour staleness threshold for cache freshness"
  - "Disable Add Entry when offline to prevent mutation issues"

patterns-established:
  - "Dexie version 2 migration pattern: Keep version 1 stores, add version 2 with new tables"
  - "Regatta cache manager: Transaction-based writes with metadata tracking"
  - "Offline hook pattern: Try API first, fallback to cache, auto-refresh on reconnect"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 5 Plan 7: Regatta Offline Cache Summary

**Extended Dexie schema to version 2 with OfflineRegatta/OfflineEntry tables, cache manager for regatta data, and useOfflineRegatta hook integrated into regatta detail UI**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T03:21:04Z
- **Completed:** 2026-01-22T03:25:31Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Extended Dexie schema to version 2 with regatta and entry tables
- Created regatta cache manager with full CRUD operations and cleanup
- Built useOfflineRegatta hook with online/offline fallback
- Integrated offline indicator and staleness display into regatta UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Dexie schema with regatta tables** - `4922d2d` (feat)
2. **Task 2: Create regatta cache manager** - `5ade9ad` (feat)
3. **Task 3: Create offline regatta hook and integrate with UI** - `7a532fc` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` - Added OfflineRegatta, OfflineEntry interfaces and version 2 schema
- `src/lib/db/regatta-cache.ts` - Cache manager with cacheRegatta, getCachedRegatta, clearRegattaCache
- `src/hooks/use-offline-regatta.ts` - Hook for offline-capable regatta data fetching
- `src/app/(dashboard)/[teamSlug]/regattas/[id]/regatta-detail-client.tsx` - Added offline indicator, staleness, refresh
- `src/app/(dashboard)/[teamSlug]/regattas/[id]/page.tsx` - Pass initialCachedAt to client component

## Decisions Made

- **Denormalized lineup in OfflineEntry:** Entries store lineup with athlete names to display without joins
- **Compound indexes for queries:** Added [teamId+startDate] and [regattaId+scheduledTime] for efficient access
- **24-hour staleness threshold:** Matches existing PWA staleness pattern from Phase 4
- **Disable Add Entry when offline:** Prevents mutation attempts that would fail

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- REG-08 (offline capability at venue) is now satisfied
- Phase 5 is complete - all 7 plans executed
- Ready for Phase 5 verification checklist

---
*Phase: 05-regatta-mode*
*Completed: 2026-01-22*
