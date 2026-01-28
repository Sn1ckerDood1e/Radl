---
phase: 25-api-authentication-jwt-security
plan: 01
subsystem: security
tags: [authentication, audit, api, jwt, middleware]

# Dependency graph
requires: []
provides: [api-route-catalogue, auth-01-compliance]
affects: [25-02, 25-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [getClaimsForApiRoute, getAuthContext, CASL-authorization]

# File tracking
key-files:
  created:
    - .planning/phases/25-api-authentication-jwt-security/25-01-AUDIT-REPORT.md
  modified: []

# Decision references
decisions: []

# Metrics
metrics:
  duration: ~30min
  completed: 2026-01-28
---

# Phase 25 Plan 01: API Authentication Audit Summary

API route authentication audit cataloguing all 88 endpoints with their auth patterns, verifying AUTH-01 compliance.

## What Was Done

### Task 1: Catalogue All API Routes
- Identified 88 API routes in `src/app/api/**/*.ts`
- Documented authentication pattern for each route:
  - 52 routes use `getClaimsForApiRoute()` (JWT claims extraction)
  - 25 routes use `getAuthContext()` + CASL (ability-based authorization)
  - 3 routes use direct `supabase.auth.getUser()` (QR export, join)
  - 2 routes use `CRON_SECRET` header (cron jobs)
  - 3 routes are intentionally public with justification

### Task 2: Verify Middleware Security
- Confirmed Next.js version 16.1.3 (CVE-2025-29927 patched)
- Verified no code reads `x-middleware-subrequest` header
- Validated public routes are minimal and justified:
  - `/api/auth/callback` - OAuth callback (required)
  - `/api/join` - Invitation acceptance (rate-limited, requires session)
  - `/api/equipment/[id]/damage-reports` - Anonymous damage reporting (rate-limited, honeypot)

## Key Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| Audit Report | `.planning/phases/25-api-authentication-jwt-security/25-01-AUDIT-REPORT.md` | Complete API route authentication inventory |

## Findings

### AUTH-01 Compliance: PASS

| Category | Count | Status |
|----------|-------|--------|
| Protected Routes | 83 | All have auth checks |
| Public Routes | 3 | All justified with mitigations |
| Cron Routes | 2 | CRON_SECRET protected |
| CVE-2025-29927 | N/A | Patched (Next.js 16.1.3) |

### Authentication Patterns

1. **`getClaimsForApiRoute()`** - Primary pattern (52 routes)
   - Extracts JWT claims including `team_id`
   - Used for team-scoped operations

2. **`getAuthContext()` + CASL** - Advanced pattern (25 routes)
   - Builds ability object for fine-grained permissions
   - Used for role-based access control

3. **Public with Mitigations** - Special cases (3 routes)
   - Rate limiting prevents abuse
   - Honeypot fields detect bots
   - Minimal data exposure

## Commits

| Hash | Message |
|------|---------|
| e008d04 | feat(25-01): complete API authentication audit (AUTH-01) |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 25-02 (JWT Validation) can proceed. This audit provides the route catalogue needed to verify JWT claims are validated consistently across all protected endpoints.
