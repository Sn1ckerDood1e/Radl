---
phase: 31
plan: 02
subsystem: ux
tags: [validation, error-messages, empty-state, notifications]
dependency-graph:
  requires: [28-01-auth-pages]
  provides: [actionable-validation-errors, notifications-empty-state]
  affects: []
tech-stack:
  added: []
  patterns: [actionable-error-messages, empty-state-component]
key-files:
  created: []
  modified:
    - src/lib/validations/auth.ts
    - src/app/(dashboard)/[teamSlug]/notifications/page.tsx
decisions: []
metrics:
  duration: "8 minutes"
  completed: "2026-01-29"
---

# Phase 31 Plan 02: Error Messages and Empty States Summary

**One-liner:** Actionable auth validation errors with examples plus EmptyState component for notifications page.

## Requirements Addressed

| Requirement | Description | Status |
|-------------|-------------|--------|
| UXQL-01 | Error messages tell users what's wrong AND how to fix it | COMPLETE |
| UXQL-02 | Empty states guide users to their next action | COMPLETE |

## What Was Built

### 1. Actionable Auth Validation Messages

Updated Zod schemas in `auth.ts` to provide clear, actionable error messages:

**Before:**
- "Invalid email address"
- "Password must be at least 8 characters"
- "Passwords don't match"

**After:**
- "Email is required" (explicit empty check)
- "Please enter a valid email address (e.g., you@example.com)" (includes example)
- "Password is required" (explicit empty check)
- "Please confirm your password" (clear instruction)
- "Passwords don't match. Please re-enter your password." (tells user what to do)

### 2. Notifications Page EmptyState

Replaced inline SVG empty state with proper EmptyState component:

**Before:**
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
  <svg>...</svg>
  <p>No notifications</p>
</div>
```

**After:**
```tsx
<EmptyState
  icon={Bell}
  title="You're all caught up"
  description="When there's team activity like new announcements, practice updates, or damage reports, you'll see notifications here."
/>
```

Benefits:
- Consistent styling with other empty states across the app
- Positive framing ("all caught up" vs "no notifications")
- Explains what would trigger notifications
- Uses Bell icon matching the notification theme

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 5501064 | feat | Update auth validation with actionable error messages |
| b819720 | feat | Add EmptyState component to notifications page |

## Files Modified

| File | Changes |
|------|---------|
| src/lib/validations/auth.ts | Replaced generic messages with actionable ones including examples |
| src/app/(dashboard)/[teamSlug]/notifications/page.tsx | Added EmptyState import and replaced inline empty state |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npm run build` succeeds
- [x] Auth validation messages include actionable guidance with examples
- [x] Notifications empty state uses EmptyState component with clear messaging

## Success Criteria Met

- [x] Login/signup validation errors tell users exactly what format is expected
- [x] Notifications page empty state looks consistent with other pages
- [x] Notifications empty state message explains what would trigger notifications
- [x] No build or TypeScript errors

## Next Phase Readiness

Plan 31-02 completes error message and empty state improvements. Ready to continue with remaining UXQL requirements in Phase 31.
