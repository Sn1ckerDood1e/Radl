---
phase: 22
plan: 12
subsystem: practice-flow
tags: [redirect, bulk-create, ux-consistency, gap-closure]
dependency-graph:
  requires: [22-10]
  provides: ["unified-practice-creation-flow"]
  affects: []
tech-stack:
  added: []
  patterns: ["redirect-for-flow-unification", "single-date-mode"]
key-files:
  created: []
  modified:
    - src/app/(dashboard)/[teamSlug]/practices/new/page.tsx
    - src/app/(dashboard)/[teamSlug]/practices/bulk-create/page.tsx
    - src/components/practices/bulk-practice-creator.tsx
decisions:
  - id: "22-12-D1"
    decision: "Redirect /practices/new to /practices/bulk-create"
    rationale: "Unifies practice creation UX - bulk-create handles both single and multi-day creation"
  - id: "22-12-D2"
    decision: "Single-date mode auto-selects only that day's day-of-week"
    rationale: "Ensures the single date is included in practice dates without requiring user to adjust day toggles"
  - id: "22-12-D3"
    decision: "Dynamic header shows context-appropriate text"
    rationale: "Clear UX indicating single vs bulk mode: 'Create Practice for Jan 30' vs 'Create Practices (5 dates)'"
metrics:
  duration: "~2 minutes"
  completed: "2026-01-27"
---

# Phase 22 Plan 12: Redirect New Practice to Bulk Create Summary

Replaced old PracticeForm-based /practices/new with redirect to bulk-create, enabling unified creation flow.

## What Changed

### Task 1: Redirect /practices/new to bulk-create
- Removed 133 lines of old PracticeForm integration code
- Added simple redirect with query param preservation (seasonId, date)
- Maintains backward compatibility for calendar "Add Practice" buttons
- Coach check before redirect to prevent unauthorized access

### Task 2: Single-date mode in bulk-create
- Bulk-create page now accepts `date` and `seasonId` searchParams
- BulkPracticeCreator receives `initialDate` and `initialSeasonId` props
- When initialDate provided:
  - Both startDate and endDate set to same day
  - Day-of-week toggles auto-select only that day
- Dynamic header updates based on selection:
  - Single date: "Create Practice for Jan 30, 2026"
  - Multiple dates: "Create Practices (5 dates)"
  - No dates: "Create Practices"

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 22-12-D1 | Redirect to bulk-create | Unifies all practice creation through single modern flow |
| 22-12-D2 | Auto-select day-of-week for initialDate | Ensures single date included without user adjustment |
| 22-12-D3 | Dynamic header text | Clear indication of single vs bulk mode |

## Verification Results

- [x] TypeScript compiles without errors
- [x] /practices/new redirects to /practices/bulk-create
- [x] Query parameters preserved through redirect (seasonId, date)
- [x] Single-date mode pre-selects day in bulk-create
- [x] Header text updates based on selection count
- [x] Multi-date bulk creation still works

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Changes |
|------|---------|
| `src/app/(dashboard)/[teamSlug]/practices/new/page.tsx` | Replaced form with redirect |
| `src/app/(dashboard)/[teamSlug]/practices/bulk-create/page.tsx` | Added searchParams handling |
| `src/components/practices/bulk-practice-creator.tsx` | Added initialDate/initialSeasonId props, dynamic header |

## Commits

| Hash | Message |
|------|---------|
| 246211f | feat(22-12): redirect /practices/new to bulk-create |
| 350936a | feat(22-12): add single-date mode to bulk-create |

## Impact

- **Old flow retired:** PracticeForm no longer used for new practice creation
- **Unified UX:** All practice creation (single or bulk) uses same interface
- **Calendar compatibility:** "Add Practice" buttons work seamlessly
- **No breaking changes:** All existing links continue to work via redirect
