---
phase: 31
plan: 01
subsystem: forms
tags: [validation, react-hook-form, ux]
dependency-graph:
  requires: []
  provides: [onTouched-validation]
  affects: [user-experience]
tech-stack:
  added: []
  patterns: [onTouched-validation, reValidateMode-onChange]
key-files:
  created: []
  modified:
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx
    - src/components/athletes/athlete-form.tsx
decisions: []
metrics:
  duration: 5min
  completed: 2026-01-29
---

# Phase 31 Plan 01: Inline Form Validation Summary

Form validation now triggers on field blur, showing errors immediately as users interact with forms.

## What Was Done

Updated three forms to use `mode: 'onTouched'` and `reValidateMode: 'onChange'`:

1. **Login form** (`src/app/(auth)/login/page.tsx`)
   - Validates email and password on blur
   - Re-validates on change after error shown

2. **Signup form** (`src/app/(auth)/signup/page.tsx`)
   - Validates email, password, and confirm password on blur
   - Re-validates on change after error shown

3. **Athlete profile form** (`src/components/athletes/athlete-form.tsx`)
   - Validates all profile fields on blur
   - Re-validates on change after error shown

## Technical Details

### Validation Mode Settings

```typescript
useForm<T>({
  mode: 'onTouched',        // Validate when field loses focus
  reValidateMode: 'onChange', // Re-validate on every keystroke after error
  resolver: zodResolver(schema),
});
```

### Why These Settings

- **`mode: 'onTouched'`**: Validates a field when it loses focus (user tabs/clicks away). This provides immediate feedback without being intrusive during typing.

- **`reValidateMode: 'onChange'`**: Once an error is shown, re-validates on every keystroke. This lets users see the error clear immediately when they fix it.

### Consistency Note

Several other forms in the codebase already had this pattern:
- `create-team-form.tsx`
- `invite-member-form.tsx`
- `template-form.tsx`

This plan brings the auth and athlete forms into alignment.

## Commits

| Hash | Description |
|------|-------------|
| db54b17 | Add onTouched validation mode to auth forms |
| 129621c | Add onTouched validation mode to athlete form |

## Verification

- [x] `mode: 'onTouched'` present in login/page.tsx
- [x] `mode: 'onTouched'` present in signup/page.tsx
- [x] `mode: 'onTouched'` present in athlete-form.tsx
- [x] `reValidateMode: 'onChange'` present in all three files
- [x] `npm run build` succeeds without errors

## Deviations from Plan

None - plan executed exactly as written.

## User Experience Impact

Before: Users had to submit the form to see validation errors
After: Users see validation errors as soon as they tab away from a field

This reduces frustration by allowing users to fix errors before attempting submission.
