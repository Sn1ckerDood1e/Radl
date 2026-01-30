---
phase: 33-legal-pages
plan: 01
subsystem: ui
tags: [legal, terms, privacy, public-routes, next.js]

# Dependency graph
requires:
  - phase: 32-safe-areas-branding
    provides: Brand teal color, CSS variables, root layout
provides:
  - Public Terms of Service page at /terms
  - Public Privacy Policy page at /privacy
  - Legal compliance foundation for production launch
affects: [signup-flow, footer-links, app-store-submission]

# Tech tracking
tech-stack:
  added: []
  patterns: [public-legal-pages]

key-files:
  created:
    - src/app/terms/page.tsx
    - src/app/privacy/page.tsx
  modified: []

key-decisions:
  - "Static pages outside route groups for public access"
  - "Effective date January 30, 2026 for both documents"
  - "Company contact: Radl, Inc., support@radl.app"

patterns-established:
  - "Legal pages: Server components with max-w-3xl centered layout"
  - "Public routes: Place outside (auth) and (dashboard) route groups"

# Metrics
duration: 4min
completed: 2026-01-30
---

# Phase 33 Plan 01: Terms of Service and Privacy Policy Summary

**Public legal pages with 9-section Terms of Service and 10-section Privacy Policy accessible without authentication.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-30T01:20:37Z
- **Completed:** 2026-01-30T01:24:XX Z
- **Tasks:** 2/2
- **Files created:** 2

## Accomplishments

- Created Terms of Service page at /terms with all required legal sections
- Created Privacy Policy page at /privacy explaining data practices
- Both pages accessible without authentication (public routes)
- Consistent styling using CSS variables and teal-600 brand color

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Terms of Service page** - `77c2e4d` (feat)
2. **Task 2: Create Privacy Policy page** - `3b9a7ec` (feat)

## Files Created

- `src/app/terms/page.tsx` - Terms of Service with 9 sections (151 lines)
- `src/app/privacy/page.tsx` - Privacy Policy with 10 sections (231 lines)

## Decisions Made

- **Static server components:** No 'use client' directive needed for legal content pages
- **Route placement:** Outside (auth) and (dashboard) route groups for public access
- **Consistent styling:** Used existing CSS variables (--surface-1, --text-primary, etc.)
- **Brand color links:** teal-600 for "Back to Home" and email links

## Verification Results

- Build completed successfully with both routes shown as static (○)
- Both pages listed in build output as public routes
- Line count requirements met: Terms 151 lines (min 50), Privacy 231 lines (min 80)

## Success Criteria Met

- [x] LEGL-01: Terms of Service page exists at /terms with effective date and company info
- [x] LEGL-02: Privacy Policy page exists at /privacy with data collection details
- [x] LEGL-04: Both pages accessible without authentication (no redirect to /login)
