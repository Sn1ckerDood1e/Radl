---
phase: 04-pwa-infrastructure
plan: 02
subsystem: database
tags: [dexie, indexeddb, offline, react-hooks, sync-queue]

# Dependency graph
requires:
  - phase: 04-01
    provides: Serwist service worker configuration
provides:
  - IndexedDB schema with radl-offline database
  - Offline schedule and lineup caching interfaces
  - Reactive React hooks for offline data queries
  - Sync queue infrastructure for background mutations
affects: [04-03, 04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: [dexie, dexie-react-hooks]
  patterns: [useLiveQuery for reactive IndexedDB queries, sync queue with retry logic]

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/hooks.ts
    - src/lib/db/sync-queue.ts

key-decisions:
  - "cachedAt timestamp on every record for staleness detection"
  - "syncStatus field tracks synced/pending/error state"
  - "Compound indexes for efficient team+date and practice+block queries"
  - "Max 3 retries before dropping sync items (prevents infinite loops)"
  - "4xx errors removed immediately (bad data won't succeed on retry)"
  - "Online listener auto-triggers sync queue processing"

patterns-established:
  - "Offline data interface: Interface with id, cachedAt, syncStatus fields"
  - "Reactive query hook: useLiveQuery with default value for loading state"
  - "Sync queue item: operation, entity, entityId, payload, timestamp, retries"

# Metrics
duration: 8min
completed: 2026-01-21
---

# Phase 4 Plan 2: IndexedDB Schema and React Hooks Summary

**Dexie.js IndexedDB database with offline schedule/lineup storage, reactive query hooks, and sync queue infrastructure for background mutations**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-21T15:30:00Z
- **Completed:** 2026-01-21T15:38:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created + 2 package files)

## Accomplishments
- Dexie database schema with versioned IndexedDB (radl-offline)
- Offline data types for schedules, lineups, sync queue, and cache metadata
- Reactive React hooks using useLiveQuery for automatic re-renders
- Sync queue with retry logic and automatic online sync trigger

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Dexie database schema with offline data types** - `e83df62` (feat)
2. **Task 2: Create React hooks for offline data queries** - `2f7c54a` (feat)
3. **Task 3: Create sync queue operations** - `a635627` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - Dexie database with OfflineSchedule, OfflineLineup, SyncQueueItem, CacheMeta interfaces
- `src/lib/db/hooks.ts` - useOfflineSchedules, useOfflineLineups, useSyncQueueCount, useCacheFreshness, useOfflineSchedule hooks
- `src/lib/db/sync-queue.ts` - queueMutation, processSyncQueue, clearSyncQueue, getPendingSyncItems functions
- `package.json` - Added dexie, dexie-react-hooks dependencies

## Decisions Made
- **cachedAt timestamp on every record:** Enables staleness detection for cache invalidation
- **syncStatus field (synced/pending/error):** Tracks sync state without separate tracking table
- **Compound indexes ([teamId+date], [practiceId+blockId]):** Efficient queries for common access patterns
- **Max 3 retries:** Prevents infinite retry loops on persistent failures
- **4xx errors removed immediately:** Client errors (bad data) won't succeed on retry
- **Online listener triggers sync:** Automatic background sync when connectivity restored

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Dexie installed cleanly and all TypeScript compiles successfully. The dexie-react-hooks package has optional y-dexie/yjs type dependencies that show warnings in direct tsc but don't affect the build.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- IndexedDB schema ready for cache population (Plan 04-03)
- React hooks ready for integration in offline-aware components
- Sync queue ready for mutations to be queued and processed

---
*Phase: 04-pwa-infrastructure*
*Completed: 2026-01-21*
