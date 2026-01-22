---
phase: 04-pwa-infrastructure
plan: 03
subsystem: pwa
tags: [indexeddb, offline, cache, dexie, staleness-indicator, hooks]

# Dependency graph
requires:
  - phase: 04-01
    provides: Service worker infrastructure
  - phase: 04-02
    provides: IndexedDB schema and hooks
provides:
  - Cache manager for syncing server data to IndexedDB
  - Offline-aware data hooks with automatic caching
  - Staleness indicator UI component
  - Unified calendar offline support
affects: [04-04, 04-05, 04-07, offline-ui, schedule-offline]

# Tech tracking
tech-stack:
  added: []
  patterns: [cache-manager-pattern, offline-aware-hooks, staleness-indicator]

key-files:
  created:
    - src/lib/db/cache-manager.ts
    - src/hooks/use-offline-data.ts
    - src/components/pwa/staleness-indicator.tsx
  modified:
    - src/components/calendar/unified-calendar.tsx
    - src/app/(dashboard)/[teamSlug]/schedule/page.tsx

key-decisions:
  - "Cache schedules during fetch: API responses automatically cached after successful fetch"
  - "Fallback to offline data: When fetch fails and navigator.onLine is false, use IndexedDB cache"
  - "24-hour stale threshold: Data older than 24 hours shows stale indicator"
  - "Auto-refresh on reconnect: Device coming back online triggers automatic data refresh"

patterns-established:
  - "Cache manager: Transaction-based writes with metadata tracking"
  - "Offline-aware hook: Combine API fetch with IndexedDB fallback and online/offline listeners"
  - "Staleness indicator: Subtle amber color for offline/stale, zinc for normal freshness display"

# Metrics
duration: 12min
completed: 2026-01-21
---

# Phase 4 Plan 3: Offline Data Sync Summary

**Cache manager, offline-aware hooks, and staleness indicator enabling schedule viewing when offline with automatic caching and refresh**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-21T18:00:00Z
- **Completed:** 2026-01-21T18:12:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Cache manager with cacheSchedules, cacheLineups, and metadata tracking
- Offline-aware hook combining API fetch with IndexedDB fallback
- Staleness indicator showing "Last updated X ago" with offline icon
- Unified calendar integrated with offline data support

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cache manager for syncing server data to IndexedDB** - `2694920` (feat)
2. **Task 2: Create offline-aware data hook and staleness indicator** - `3f8c149` (feat)
3. **Task 3: Integrate offline data into schedule page** - `65da167` (feat)

**Bug fixes:** `80d7869` (fix: TypeScript build errors)
**Auto-generated:** `197583a` (chore: next-env.d.ts)

## Files Created/Modified
- `src/lib/db/cache-manager.ts` - Functions to sync server data to IndexedDB (cacheSchedules, cacheLineups, updateCacheMeta, getCacheMeta, isCacheExpired, clearTeamCache)
- `src/hooks/use-offline-data.ts` - useScheduleWithOffline hook combining online fetch with offline fallback
- `src/components/pwa/staleness-indicator.tsx` - UI component showing cache freshness with offline icon
- `src/components/calendar/unified-calendar.tsx` - Added teamId prop, offline hooks, caching, StalenessIndicator
- `src/app/(dashboard)/[teamSlug]/schedule/page.tsx` - Pass teamId to UnifiedCalendar

## Decisions Made
- **Cache during fetch, not separately:** API responses cached immediately after successful fetch rather than requiring separate cache population call
- **Display events from cache as fallback:** When offline with no API data, transform offline schedules to ScheduleEvent format for display
- **Subtle staleness UI:** Per CONTEXT.md, indicator uses amber color but isn't alarming - positioned under month title
- **Show spinner only when no cache:** Loading state only shows spinner if no cached data available (better UX with stale-while-revalidate feel)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript build errors in service worker**
- **Found during:** Task 3 build verification
- **Issue:** sw.ts missing webworker lib reference, ServiceWorkerGlobalScope type not found
- **Fix:** Added `/// <reference lib="webworker" />` directive
- **Files modified:** src/app/sw.ts
- **Committed in:** 80d7869

**2. [Rule 3 - Blocking] Fixed TypeScript type cast in push subscribe**
- **Found during:** Task 3 build verification
- **Issue:** Uint8Array type incompatible with applicationServerKey expected type
- **Fix:** Cast `.buffer as ArrayBuffer` for proper type matching
- **Files modified:** src/lib/push/subscribe.ts
- **Committed in:** 80d7869

**3. [Rule 3 - Blocking] Excluded Supabase edge functions from TypeScript compilation**
- **Found during:** Task 3 build verification
- **Issue:** Deno types not available, causing build failure on supabase/functions
- **Fix:** Added "supabase" to tsconfig.json exclude array
- **Files modified:** tsconfig.json
- **Committed in:** 80d7869

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All fixes were pre-existing build issues from earlier phases. No scope creep.

## Issues Encountered
- UnifiedCalendar needed teamId prop for offline caching - plan specified modifying schedule page but actual integration point was the calendar component

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Offline data infrastructure complete, ready for UI indicators (04-04)
- Schedule page shows cached data when offline with staleness indicator
- Cache manager ready for additional entity caching

---
*Phase: 04-pwa-infrastructure*
*Completed: 2026-01-21*
