---
phase: 15-mobile-pwa-improvements
plan: 02
subsystem: pwa
tags: [mobile, sync-status, offline, network-indicator, dropdown]

# Dependency graph
requires:
  - phase: 15-01
    provides: "@use-gesture/react and vaul for mobile interactions"
  - phase: 14-design-system-foundation
    provides: "shadcn/ui Button and DropdownMenu components"
provides:
  - "useSyncStatus hook combining online status with sync queue state"
  - "SyncStatusIndicator component for header network status display"
affects: [15-03, 15-04, 15-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [hook-composition, dropdown-status-indicator]

key-files:
  created:
    - src/hooks/use-sync-status.ts
    - src/components/pwa/sync-status-indicator.tsx
  modified:
    - src/components/layout/dashboard-header.tsx

key-decisions:
  - "Use DropdownMenu for status details rather than custom Popover - consistent with existing header patterns"
  - "State priority: offline > syncing > error > pending > online - most critical states shown first"
  - "Hide indicator when online with no pending - minimal UI when everything is working"
  - "pulse animation for pending, spin for syncing - clear visual distinction between states"

patterns-established:
  - "Hook composition: useSyncStatus combines useOnlineStatus + useSyncQueueCount + local state"
  - "State-to-config mapping: stateConfig record maps SyncState to visual properties"
  - "Conditional dropdown: only render interactive elements when there are issues to address"

# Metrics
duration: 4min
completed: 2026-01-24
---

# Phase 15 Plan 02: Network Status Indicator Summary

**Enhanced sync status indicator with useSyncStatus hook combining online/pending/syncing/error states and SyncStatusIndicator component with dropdown details**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-24
- **Completed:** 2026-01-24
- **Tasks:** 3/3
- **Files created:** 2
- **Files modified:** 1

## Accomplishments

- Created useSyncStatus hook that combines:
  - useOnlineStatus for network connectivity
  - useSyncQueueCount for pending mutations count
  - Local state for syncing and error tracking
  - Computed SyncState: online | offline | pending | syncing | error

- Created SyncStatusIndicator component with:
  - Four visible states: offline (amber), pending (blue+pulse), syncing (blue+spin), error (red)
  - Hidden when online with no pending changes
  - DropdownMenu showing status details, pending count, error messages
  - Retry sync and dismiss error actions

- Integrated into dashboard header replacing basic SyncStatus component

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useSyncStatus hook** - `50d0643` (feat)
2. **Task 2: Create SyncStatusIndicator component** - `05952bd` (feat)
3. **Task 3: Integrate into dashboard header** - `dcebcf4` (feat)

## Files Created/Modified

- `src/hooks/use-sync-status.ts` - New hook combining online status and sync queue state
- `src/components/pwa/sync-status-indicator.tsx` - New header network status indicator
- `src/components/layout/dashboard-header.tsx` - Updated to use SyncStatusIndicator

## useSyncStatus Hook API

```typescript
interface SyncStatusResult {
  isOnline: boolean;
  state: SyncState; // 'online' | 'offline' | 'pending' | 'syncing' | 'error'
  pendingCount: number;
  hasPending: boolean;
  hasError: boolean;
  lastError: string | null;
  triggerSync: () => Promise<void>;
  clearError: () => void;
}
```

## SyncStatusIndicator Visual States

| State | Icon | Background | Animation |
|-------|------|------------|-----------|
| offline | CloudOff | amber-100/amber-900 | none |
| pending | Cloud + badge | blue-100/blue-900 | pulse |
| syncing | RefreshCw | blue-100/blue-900 | spin |
| error | AlertCircle | red-100/red-900 | none |
| online | (hidden) | - | - |

## Decisions Made

1. **DropdownMenu over Popover** - Consistent with ThemeToggle pattern in header
2. **State priority ordering** - Offline first (most critical), then active states, then passive
3. **Hidden when healthy** - Reduce UI noise when sync is working normally
4. **Pending count badge** - Quick visibility of queue size without opening dropdown

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript type narrowing** - Initial implementation had a comparison that TypeScript flagged as impossible after early return for 'online' state. Removed redundant hasIssues check since TypeScript correctly inferred state cannot be 'online' after early return.

## User Setup Required

None - uses existing hooks and sync infrastructure.

## Next Phase Readiness

**Ready for enhanced offline experience:**
- Users now have clear visual feedback about connectivity
- Pending changes are visible with count
- Manual retry available when sync fails
- Error states can be acknowledged and dismissed

**Key links verified:**
- useSyncStatus -> useOnlineStatus (import)
- useSyncStatus -> useSyncQueueCount (import)
- SyncStatusIndicator -> useSyncStatus (import)
- dashboard-header -> SyncStatusIndicator (import and render)

**No blockers or concerns.**

---
*Phase: 15-mobile-pwa-improvements*
*Completed: 2026-01-24*
