---
phase: 34-ux-polish
plan: 03
subsystem: ui-components
tags: [button, loading, form-validation, error-handling, toast]

# Dependency graph
requires:
  - phase: 34-01
    provides: DelayedSpinner component
provides:
  - Button loading prop with DelayedSpinner integration
  - ERRR-02 compliance (onTouched validation for all forms)
  - Error handling audit findings
  - Optimistic update coverage documentation
affects:
  - All components using Button with loading state
  - All forms in the application

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Button loading prop uses DelayedSpinner for 300ms delay"
    - "Form validation: mode: 'onTouched' for blur-based validation"

key-files:
  created: []
  modified:
    - src/components/ui/button.tsx
    - src/components/practices/practice-form.tsx
    - src/components/practices/workout-builder.tsx
    - src/components/equipment/equipment-form.tsx
    - src/components/equipment/damage-report-form.tsx
    - src/components/equipment/facility-equipment-form.tsx
    - src/app/(dashboard)/facility/[facilitySlug]/events/new/page.tsx

key-decisions:
  - "Button with asChild only disables (cannot inject spinner into Slot)"
  - "Spinner size maps: sm/xs -> sm spinner, default/lg -> md spinner"
  - "ERRR-02 required fixing 6 forms missing mode: 'onTouched'"
  - "Error toast retry gaps documented for future work (12 locations)"

patterns-established:
  - "Button loading prop auto-disables and shows delayed spinner"
  - "All forms use mode: 'onTouched' for immediate validation feedback"

# Metrics
duration: 8min
completed: 2026-01-30
---

# Phase 34 Plan 03: Button Loading & Error Handling Audit Summary

**Button loading prop with DelayedSpinner, ERRR-02 compliance fixed, error handling patterns documented**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-30
- **Completed:** 2026-01-30
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Button component enhanced with loading prop using DelayedSpinner (LOAD-03)
- All 12 forms now use mode: 'onTouched' for blur-based validation (ERRR-02)
- Error handling patterns audited with gaps documented (ERRR-01, ERRR-03)
- Optimistic update coverage documented (ERRR-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Button loading prop** - `e687105` (feat)
2. **Task 2: ERRR-02 form validation fixes** - `825adff` (fix)

Tasks 3 and 4 were audit-only (no code changes).

## Files Modified

- `src/components/ui/button.tsx` - Added loading prop, imports DelayedSpinner, exports ButtonProps type

- `src/components/practices/practice-form.tsx` - Added mode: 'onTouched'
- `src/components/practices/workout-builder.tsx` - Added mode: 'onTouched'
- `src/components/equipment/equipment-form.tsx` - Added mode: 'onTouched'
- `src/components/equipment/damage-report-form.tsx` - Added mode: 'onTouched'
- `src/components/equipment/facility-equipment-form.tsx` - Added mode: 'onTouched'
- `src/app/(dashboard)/facility/[facilitySlug]/events/new/page.tsx` - Added mode: 'onTouched'

## Button Loading Prop Usage

```tsx
// Basic usage
<Button loading={isSubmitting}>Save</Button>

// With size (spinner size maps automatically)
<Button size="sm" loading={isLoading}>Submit</Button>
<Button size="lg" loading={isPending}>Create</Button>

// With variant (works with all variants)
<Button variant="destructive" loading={isDeleting}>Delete</Button>
```

**Features:**
- Shows DelayedSpinner after 300ms (no spinner flash)
- Auto-disables button when loading
- Spinner size maps: xs/sm/icon -> 'sm' spinner, default/lg -> 'md' spinner
- Works with all button variants and sizes
- Handles asChild mode (just disables, parent manages spinner)

## ERRR-02 Verification: Form Validation

**Status:** COMPLETE (with fixes applied)

All 12 forms now use `mode: 'onTouched'` for blur-based validation:

| Form | Status |
|------|--------|
| athlete-form.tsx | Already compliant |
| template-form.tsx | Already compliant |
| create-team-form.tsx | Already compliant |
| invite-member-form.tsx | Already compliant |
| login/page.tsx | Already compliant |
| signup/page.tsx | Already compliant |
| practice-form.tsx | Fixed (was missing) |
| workout-builder.tsx | Fixed (was missing) |
| equipment-form.tsx | Fixed (was missing) |
| damage-report-form.tsx | Fixed (was missing) |
| facility-equipment-form.tsx | Fixed (was missing) |
| events/new/page.tsx | Fixed (was missing) |

## Error Toast Audit: ERRR-01 & ERRR-03

**Status:** PARTIAL - Gaps documented for future work

### Using showErrorToast (proper pattern with retry):
- `rc-settings-section.tsx` - 4 usages with retry
- `create-announcement-form.tsx` - 1 usage with retry
- `damage-report-form.tsx` - 1 usage with retry
- `create-team-form.tsx` - 1 usage with retry
- `invite-member-form.tsx` - 1 usage with retry
- `qr-bulk-export.tsx` - 2 usages (1 with retry)
- `announcements-management-client.tsx` - 1 usage with retry

### Validation errors (correctly no retry):
- "Please select a season" - validation
- "No practices to create" - validation
- "Too many practices" - validation
- "PM5 limit reached" - validation

### Network errors missing retry (gap):
These 12 locations use `toast.error` without retry for network failures:

| File | Error Message |
|------|---------------|
| bulk-practice-creator.tsx:189 | "Failed to create practices" |
| practice-list-client.tsx:103 | "Failed to delete practices" |
| workout-builder.tsx:150 | "Failed to save workout" |
| workout-builder.tsx:166 | "Failed to remove workout" |
| workout-builder.tsx:183 | "Failed to save template" |
| season-manager.tsx:134 | "Failed to archive season" |
| multi-boat-lineup-builder.tsx:244 | "Failed to save lineups" |
| inline-practice-page.tsx:185 | "Failed to delete block" |
| inline-practice-page.tsx:202 | "Failed to add block" |
| inline-practice-page.tsx:234 | "Failed to reorder blocks" |
| inline-practice-page.tsx:248 | "Failed to update status" |
| inline-practice-page.tsx:267 | "Failed to delete practice" |

**Recommendation:** Consider a follow-up plan to migrate these to `showErrorToast` with retry actions.

### Already has retry (proper implementation):
- `use-autosave.ts:74` - Uses raw toast.error with action object

## Optimistic Update Audit: ERRR-04

**Status:** PARTIAL - Infrastructure exists, limited usage

### Infrastructure:
- `useOfflineMutation` hook exists at `src/hooks/use-offline-mutation.ts`
- `useAutosave` hook exists at `src/hooks/use-autosave.ts`
- `executeWithOfflineFallback` exists at `src/lib/db/offline-mutations.ts`

### Current Usage:
1. **Block reorder** (`inline-practice-page.tsx:211-220`) - Manual optimistic update with setState
2. **Offline mutations** - Full infrastructure but no active consumers

### Key Operations Without Optimistic Updates:
- Create practice
- Delete practice
- Save lineups
- Archive season
- Save workout
- Delete block

**Recommendation:** The optimistic update infrastructure is ready but underutilized. Consider adopting `useOfflineMutation` or `useAutosave` for key mutation operations in a future plan.

## Deviations from Plan

### [Rule 2 - Missing Critical] Added mode: 'onTouched' to 6 forms

**Found during:** Task 2
**Issue:** 6 forms were missing `mode: 'onTouched'`, causing validation errors to only show on submit rather than on blur
**Fix:** Added `mode: 'onTouched'` to all affected forms
**Files modified:** 6 form components
**Commit:** `825adff`

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Future Work Identified

1. **Error Toast Retry Migration** - 12 network error locations need migration to `showErrorToast` with retry
2. **Optimistic Update Adoption** - Consider using existing hooks (`useOfflineMutation`, `useAutosave`) for key mutations

## Next Phase Readiness

- LOAD-03 complete: Button loading prop with 300ms delayed spinner
- ERRR-02 complete: All forms use onTouched validation
- ERRR-01/ERRR-03 partial: showErrorToast pattern exists, 12 locations need migration
- ERRR-04 partial: Infrastructure exists, needs wider adoption
- Ready for 34-04 (remaining UX Polish tasks)

---
*Phase: 34-ux-polish*
*Completed: 2026-01-30*
