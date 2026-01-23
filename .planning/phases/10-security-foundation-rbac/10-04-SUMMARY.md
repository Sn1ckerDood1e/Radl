---
phase: 10-security-foundation-rbac
plan: 04
subsystem: auth
tags: [casl, react, permissions, rbac, context]

# Dependency graph
requires:
  - phase: 10-02
    provides: CASL ability definition (defineAbilityFor, createEmptyAbility, AppAbility, UserContext)
provides:
  - AbilityProvider React context for client-side permissions
  - Can component for permission-based conditional rendering
  - useAbility hook for custom permission checks
affects: [10-05, 10-06, 10-07, 10-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AbilityProvider wraps app, provides CASL ability to all children"
    - "Can component for declarative permission checks in JSX"
    - "useAbility hook for imperative permission checks in logic"
    - "Safe fallback: empty ability when outside provider (no crash, no permissions)"

key-files:
  created:
    - src/components/permissions/ability-provider.tsx
    - src/components/permissions/can.tsx
    - src/hooks/use-ability.ts
  modified: []

key-decisions:
  - "AbilityContext allows null, AbilityProvider handles null user with empty ability"
  - "Can component uses type assertion for context consumer (standard CASL pattern)"
  - "useAbility returns empty ability when context unavailable (safe fallback)"

patterns-established:
  - "Permission components in src/components/permissions/"
  - "Memoize ability in provider to avoid recreation on every render"
  - "All permission components marked 'use client' (required for React hooks/context)"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 10 Plan 04: React Permission Integration Summary

**AbilityProvider context, Can component, and useAbility hook for client-side permission checks using CASL**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T01:39:00Z
- **Completed:** 2026-01-23T01:41:55Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- AbilityProvider context wrapping app with memoized ability based on user context
- Can component for declarative permission-based rendering (hide/show, passThrough modes)
- useAbility hook for imperative permission checks with safe fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AbilityProvider context** - `9d8bc0d` (feat)
2. **Task 2: Create bound Can component** - `1d08451` (feat)
3. **Task 3: Create useAbility hook** - `0ce88ea` (feat)

## Files Created

- `src/components/permissions/ability-provider.tsx` - React context provider for CASL ability, memoizes ability based on user context
- `src/components/permissions/can.tsx` - Bound Can component using createContextualCan for permission-based rendering
- `src/hooks/use-ability.ts` - Hook to access ability instance with safe fallback to empty ability

## Decisions Made

- **Null context handling:** AbilityContext created with null default. AbilityProvider creates empty ability when user is null. useAbility returns empty ability when context unavailable. This ensures components never crash when outside provider - they just have no permissions.
- **Type assertion for Can component:** Used `AbilityContext.Consumer as React.Consumer<AnyAbility>` because createContextualCan expects non-null consumer. This is the standard CASL pattern.
- **Memoization:** Ability memoized with useMemo based on user prop to avoid recreation on every render.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Can component type error:** Initial implementation had TypeScript error because AbilityContext allows null but createContextualCan expects non-null consumer. Fixed with type assertion, which is the standard CASL approach documented in their examples.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- React permission system complete and ready for use
- AbilityProvider should be integrated into app layout (Phase 10-05 or 10-06)
- Dashboard components can now use Can and useAbility for permission checks
- Ability updates automatically when user context changes (e.g., club switch)

---
*Phase: 10-security-foundation-rbac*
*Completed: 2026-01-23*
