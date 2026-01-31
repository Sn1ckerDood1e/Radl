---
phase: 38-facility-club-management
plan: 04
subsystem: admin
tags: [forms, crud, validation, dialog]
requires: ["38-01"]
provides: ["facility-forms", "type-to-confirm-pattern", "facility-crud-ui"]
affects: ["38-05", "38-06"]
tech-stack:
  added: []
  patterns: ["shared-form-component", "type-to-confirm-delete", "form-sections"]
key-files:
  created:
    - src/components/admin/type-to-confirm-dialog.tsx
    - src/components/admin/facilities/facility-form.tsx
    - src/app/(admin)/admin/facilities/new/page.tsx
    - src/app/(admin)/admin/facilities/[facilityId]/edit/page.tsx
    - src/app/(admin)/admin/facilities/[facilityId]/edit/facility-delete-section.tsx
  modified: []
decisions:
  - id: type-to-confirm-pattern
    outcome: GitHub-style delete requiring exact name match
  - id: form-sections
    outcome: Three form sections (Basic Info, Location, Contact) for better UX
  - id: auto-slug-on-blur
    outcome: Slug auto-generates from name on blur in create mode only
metrics:
  duration: 11m
  completed: 2026-01-31
---

# Phase 38 Plan 04: Facility Forms & Delete Dialog Summary

Type-to-confirm dialog for safe deletions, shared facility form for create/edit

## What Was Built

### 1. TypeToConfirmDialog Component (FCLT-05 UI)
- Reusable dialog for dangerous operations (GitHub-style delete pattern)
- Requires exact text match to enable confirm button
- Supports destructive/warning visual variants
- Auto-resets input when dialog closes
- Keyboard support (Enter key to confirm)

### 2. FacilityForm Component (FCLT-02, FCLT-03 UI)
- Shared form component for create and edit modes
- Three organized sections: Basic Info, Location, Contact
- Auto-generates slug from name on blur (create mode only, if slug empty)
- Uses react-hook-form with mode: 'onTouched', reValidateMode: 'onChange'
- Validates using zod schema
- POSTs to /api/admin/facilities (create) or PATCHes (edit)

### 3. Facility Pages
- **new/page.tsx**: Simple wrapper rendering FacilityForm in create mode
- **edit/page.tsx**: Server component fetching facility data, rendering form with defaults
- **facility-delete-section.tsx**: Danger Zone section with cascade preview

### 4. Delete Workflow
1. User clicks "Delete Facility" button
2. DELETE request without `confirm=true` returns cascade preview
3. TypeToConfirmDialog shows impact (clubs, members to be deleted)
4. User must type exact facility name to enable delete
5. Confirm sends DELETE with `?confirm=true`
6. Success redirects to /admin/facilities

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0abba5d | feat | Add type-to-confirm dialog component |
| 2f963a3 | feat | Add shared facility form component |
| dcd48a8 | feat | Add facility new and edit pages with delete section |

## Decisions Made

1. **Type-to-confirm pattern**: GitHub-style delete requiring exact entity name match. More secure than simple "yes/no" confirmation for destructive operations.

2. **Form sections**: Organized into Basic Info, Location, and Contact sections for better UX on the comprehensive facility form.

3. **Auto-slug on blur**: Slug only auto-generates during create mode when user blurs the name field and slug is still empty. Edit mode preserves existing slug.

4. **Cascade preview before delete**: DELETE without `confirm=true` returns impact stats. Allows showing user what will be deleted before they commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added facility-delete-section.tsx**
- **Found during:** Task 3
- **Issue:** Edit page needed separate client component for delete dialog state management
- **Fix:** Created dedicated FacilityDeleteSection client component
- **Files created:** src/app/(admin)/admin/facilities/[facilityId]/edit/facility-delete-section.tsx
- **Commit:** dcd48a8

## Artifacts Verification

| Artifact | Status | Lines |
|----------|--------|-------|
| src/app/(admin)/admin/facilities/new/page.tsx | Created | 34 (>20) |
| src/app/(admin)/admin/facilities/[facilityId]/edit/page.tsx | Created | 116 (>30) |
| src/components/admin/facilities/facility-form.tsx | Created | 431 |
| src/components/admin/type-to-confirm-dialog.tsx | Created | 147 |

## Key Links Verification

| From | To | Pattern | Status |
|------|------|---------|--------|
| facility-form.tsx | /api/admin/facilities | `'/api/admin/facilities'` | Verified |
| type-to-confirm-dialog.tsx | inputValue === confirmText | `inputValue === confirmText` | Verified |

## Success Criteria

- [x] Super admin can create facility via form at /admin/facilities/new
- [x] Slug auto-generates from name during creation
- [x] Super admin can edit facility at /admin/facilities/[id]/edit
- [x] Delete section shows cascade impact (clubs, members)
- [x] Delete requires typing exact facility name to confirm
- [x] All form fields validate correctly (zod + onTouched mode)

## Next Phase Readiness

Ready for 38-05 (Club Forms & Delete Dialog) and 38-06 (Member Management UI). The TypeToConfirmDialog component is reusable for club deletion.
