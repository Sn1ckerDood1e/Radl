---
phase: 31
plan: 03
subsystem: settings
tags: [ux, settings, cleanup, deferred-feature]
dependency-graph:
  requires: []
  provides: [cleaner-settings-page]
  affects: [user-experience]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/app/(dashboard)/[teamSlug]/settings/page.tsx
decisions:
  - Team Colors section removed until feature is fully implemented
metrics:
  duration: 6min
  completed: 2026-01-29
---

# Phase 31 Plan 03: Settings Cleanup Summary

Removed the non-functional Team Colors section from the settings page to reduce user confusion.

## What Was Done

### Task 1: Remove Team Colors Section

Removed the entire Team Colors section from the settings page, including:

1. **State variables removed:**
   - `savingColors` - loading state for color save
   - `colorSuccess` - success message state
   - `primaryColor` - primary color input state
   - `secondaryColor` - secondary color input state

2. **Functions removed:**
   - `handleSaveColors()` - API call to save colors
   - `hasColorChanges()` - dirty state detection

3. **Simplified state:**
   - `teamInfo` now initializes with empty color strings (still needed for team name)

4. **JSX removed:**
   - Entire Team Colors card (lines 318-410)
   - Primary/secondary color pickers
   - Color preview banner
   - Save Colors button

### Task 2: Verify Mobile Touch Targets

Verified existing WCAG 2.5.5 compliant CSS rules in `globals.css`:

```css
@media (max-width: 768px) {
  button, [role="button"], .btn {
    min-height: 44px;
    min-width: 44px;
  }

  button:has(> svg:only-child),
  [role="button"]:has(> svg:only-child) {
    width: 44px;
    height: 44px;
  }

  input[type="text"], select, textarea {
    min-height: 44px;
  }

  nav a, header a {
    min-height: 44px;
  }
}
```

Touch target CSS already present - no changes needed.

## Technical Details

### Why Remove Team Colors

The Team Colors feature is documented in tech debt as deferred:
- Color settings are stored in the database
- UI uses fixed emerald colors regardless of settings
- Showing a color picker that doesn't affect anything confuses users (UXQL-05)

The feature can be re-added when:
1. CSS custom properties are wired to database values
2. Theme provider reads team colors on load
3. Components use `var(--team-primary)` instead of hardcoded colors

### Settings Page Structure After Change

1. Equipment Readiness Thresholds (first section now)
2. Regatta Central
3. Appearance (theme toggle)
4. Push Notifications
5. Security
6. Account (logout)
7. Regatta Central Settings
8. Damage Report Recipients
9. Danger Zone

## Commits

| Hash | Description |
|------|-------------|
| 771c917 | Remove Team Colors section from settings page |

## Verification

- [x] `grep "Team Colors"` returns NO matches in settings page
- [x] `grep "handleSaveColors"` returns NO matches
- [x] `grep "primaryColor"` returns only interface definition and empty default
- [x] `npm run build` succeeds
- [x] First settings section is "Equipment Readiness Thresholds"
- [x] Mobile touch target CSS rules present (44px minimum)

## Deviations from Plan

None - plan executed exactly as written.

## User Experience Impact

Before: Users saw a Team Colors section with color pickers that did nothing
After: Settings page only shows working features

This eliminates confusion from the non-functional color picker and creates a cleaner, more focused settings experience.
