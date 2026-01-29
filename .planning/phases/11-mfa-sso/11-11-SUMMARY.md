---
phase: 11-mfa-sso
plan: 11
subsystem: authentication
tags: [sso, saml, settings, admin-ui]
depends_on:
  requires: ["11-08"]
  provides: ["sso-config-ui", "sso-settings-page"]
  affects: ["12-facility-model"]
tech-stack:
  added: []
  patterns: ["server-component-page", "client-form-component", "role-mapping-editor"]
key-files:
  created:
    - src/app/(dashboard)/[slug]/settings/sso/page.tsx
    - src/components/settings/sso-config-form.tsx
  modified: []
decisions:
  - decision: "Used CSS variables for theming consistency"
    rationale: "Match existing codebase patterns from api-keys page"
  - decision: "Role toggle buttons instead of multi-select"
    rationale: "Better UX for selecting multiple roles"
metrics:
  duration: "2 minutes"
  completed: "2026-01-23"
---

# Phase 11 Plan 11: SSO Configuration UI Summary

SSO configuration page with role mapping editor for facility admins.

## What Was Built

### SSO Settings Page (`/[slug]/settings/sso`)
Server component that:
- Restricts access to FACILITY_ADMIN role only
- Loads existing SSO configuration from database
- Provides sensible defaults for new configurations
- Displays setup help instructions

### SSO Configuration Form Component
Client component (`SsoConfigForm`) with:
- Enable/disable SSO toggle
- IDP configuration (provider ID, domain, group claim)
- Role mappings editor:
  - Add new mappings (IDP group -> Radl roles)
  - Remove existing mappings
  - Multi-role selection via toggle buttons
- Default role selector for unmatched users
- Allow override toggle for local role overrides
- Save via PUT /api/sso/config

## Implementation Approach

Used existing patterns from the codebase:
- Server component for auth/data loading (like api-keys page)
- Client form with useState for form state
- CSS variables for theme consistency
- Standard error/success alert patterns

## Commits

| Hash | Description |
|------|-------------|
| 0ee1b13 | feat(11-11): create SSO configuration form component |
| dff956d | feat(11-11): create SSO settings page for facility admins |

## Verification Results

- [x] TypeScript compiles without errors
- [x] SSO settings page restricts to FACILITY_ADMIN
- [x] Form saves via PUT /api/sso/config
- [x] Role mappings can be added and removed
- [x] All form fields editable

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

- **API**: Uses `/api/sso/config` endpoint (GET/PUT) from plan 11-08
- **Auth**: Uses `requireTeam()` and `getCurrentClubId()` from existing auth
- **Database**: Uses `getSsoConfig()` from `@/lib/auth/sso`

## Next Phase Readiness

SSO UI complete. Depends on:
- SSO provider configuration in authentication system (manual setup)
- Facility model (Phase 12) for proper facility-level SSO config
