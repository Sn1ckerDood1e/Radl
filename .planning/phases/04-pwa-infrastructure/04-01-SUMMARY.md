---
phase: 04-pwa-infrastructure
plan: 01
subsystem: pwa
tags: [serwist, service-worker, pwa, manifest, offline]

# Dependency graph
requires:
  - phase: 03-lineup-management
    provides: Complete application with data models
provides:
  - Service worker with caching strategies
  - PWA manifest for installation
  - Service worker registration component
affects: [04-02, 04-03, 04-04, offline-sync, push-notifications]

# Tech tracking
tech-stack:
  added: [@serwist/next, serwist, dexie, dexie-react-hooks, web-push]
  patterns: [service-worker-registration, pwa-manifest, cache-strategies]

key-files:
  created:
    - src/app/sw.ts
    - public/manifest.json
    - public/icons/icon-192x192.png
    - public/icons/icon-512x512.png
    - src/components/pwa/register-sw.tsx
  modified:
    - next.config.ts
    - src/app/layout.tsx
    - .gitignore

key-decisions:
  - "Use @serwist/next defaultCache for production-tested caching strategies"
  - "Service worker registration only in production (skip dev mode)"
  - "Build requires --webpack flag for Serwist compatibility"

patterns-established:
  - "PWA registration: Client component returns null, runs useEffect registration"
  - "Caching: Auth routes NetworkOnly, API routes NetworkFirst, static CacheFirst"
  - "Service worker source at src/app/sw.ts, generated to public/sw.js"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 4 Plan 1: PWA Foundation Summary

**Serwist service worker with @serwist/next defaultCache strategies, PWA manifest, and automatic registration in production builds**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-22T01:39:28Z
- **Completed:** 2026-01-22T01:47:30Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Service worker integration with webpack build via withSerwist wrapper
- PWA manifest with app metadata and placeholder icons
- Automatic service worker registration in production
- Caching strategies: Auth routes never cached, API routes network-first, static assets cached

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PWA dependencies and configure Serwist** - `dade06e` (feat)
2. **Task 2: Create service worker and PWA manifest** - `3d77aa5` (feat)
3. **Task 3: Create registration component and wire into app** - `a210b2a` (feat)

## Files Created/Modified
- `next.config.ts` - Serwist withSerwist wrapper configuration
- `src/app/sw.ts` - Service worker entry point with caching strategies
- `public/manifest.json` - PWA manifest with app metadata
- `public/icons/icon-192x192.png` - Placeholder icon (blue square)
- `public/icons/icon-512x512.png` - Placeholder icon (blue square)
- `src/components/pwa/register-sw.tsx` - Client-side registration component
- `src/app/layout.tsx` - Added manifest link, theme-color, and registration component
- `.gitignore` - Added generated sw.js files

## Decisions Made
- **Use defaultCache from @serwist/next:** Production-tested caching strategies already handle auth routes (NetworkOnly), API routes (NetworkFirst with 10s timeout), static assets (CacheFirst/StaleWhileRevalidate), and RSC pages (NetworkFirst). No need to reinvent.
- **Registration only in production:** Service workers can cause confusing behavior during development (caching stale assets). Only register when NODE_ENV === 'production'.
- **Build with --webpack flag:** Serwist requires webpack for service worker bundling. Turbopack (default) doesn't work. Updated package.json build script.
- **Placeholder icons:** Created simple blue square PNGs programmatically. Can be replaced with proper branded icons later.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed RuntimeCaching API mismatch**
- **Found during:** Task 1/2 (Build verification)
- **Issue:** Plan specified `urlPattern` property but Serwist v9 uses `matcher` property
- **Fix:** Switched to using @serwist/next's `defaultCache` export which provides correct API
- **Files modified:** src/app/sw.ts
- **Verification:** Build passes, service worker generated correctly
- **Committed in:** 3d77aa5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** API change handled by using better abstraction (defaultCache). No scope creep.

## Issues Encountered
None - build succeeded after API fix

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Service worker infrastructure ready for offline data layer (04-02)
- PWA installable in browsers that support it
- Caching strategies active for production builds
- Note: Verification of actual service worker behavior requires running `npm run build && npm run start` and checking DevTools

---
*Phase: 04-pwa-infrastructure*
*Completed: 2026-01-22*
