---
phase: 12
plan: 06
subsystem: auth
tags: [typescript, jwt, cookies, facility-context]
dependency-graph:
  requires: [12-02, 12-03]
  provides: [facility-context-helpers, extended-claims]
  affects: [12-07, 13-xx]
tech-stack:
  added: []
  patterns: [cookie-based-context, fallback-chain]
key-files:
  created:
    - src/lib/auth/facility-context.ts
  modified:
    - src/lib/auth/claims.ts
decisions:
  - id: three-tier-fallback
    choice: "Cookie -> DB -> JWT fallback chain for facilityId"
    rationale: "Handles stale JWTs and missing cookies gracefully"
metrics:
  duration: 194s
  completed: 2026-01-23
---

# Phase 12 Plan 06: TypeScript Helpers for Facility Context Summary

**One-liner:** Cookie-based facility context with DB and JWT fallback chain in claims helper

## What Was Built

Extended the authentication claims system to support facility hierarchy:

1. **Extended CustomJwtPayload Interface**
   - Added `facility_id: string | null` to JWT payload interface
   - Added `facilityId: string | null` to ClaimsResult type
   - All error returns now include facilityId: null

2. **Facility Context Cookie Helper** (`src/lib/auth/facility-context.ts`)
   - `getCurrentFacilityId()` - reads facility from httpOnly cookie
   - `setCurrentFacilityId()` - writes facility to httpOnly cookie
   - `clearCurrentFacilityId()` - removes cookie on logout
   - `detectUserFacility()` - finds user's facility from ClubMembership

3. **Claims Integration**
   - Import and use `getCurrentFacilityId` in claims helper
   - Three-tier fallback: Cookie -> Team.facilityId DB lookup -> JWT claims
   - getClaimsForApiRoute now returns facilityId alongside clubId

## Technical Decisions

### Three-tier Fallback Chain

The facilityId resolution follows this priority:
1. Cookie value (user's active selection)
2. Database lookup via Team.facilityId (when cookie missing but clubId exists)
3. JWT claims.facility_id (last resort fallback)

This handles:
- Fresh logins before cookie is set
- Stale JWTs after facility changes
- Users switching between facilities

### Pattern Consistency

facility-context.ts mirrors club-context.ts exactly:
- Same cookie configuration (httpOnly, secure in prod, sameSite: lax, 1 year maxAge)
- Same async patterns
- Same naming conventions

## Commits

| Hash | Description |
|------|-------------|
| df3388e | feat(12-06): extend CustomJwtPayload interface with facility_id |
| cd073e3 | feat(12-06): create facility context cookie helper |
| 9377ffd | feat(12-06): wire up facility context in claims helper |

## Files Changed

### Created
- `src/lib/auth/facility-context.ts` - Facility context cookie management (76 lines)

### Modified
- `src/lib/auth/claims.ts` - Extended with facility_id support (+33 lines)

## Verification Results

- TypeScript compiles without errors in auth files
- CustomJwtPayload includes `facility_id: string | null`
- ClaimsResult includes `facilityId: string | null`
- facility-context.ts has get/set/clear/detect functions
- claims.ts imports and uses getCurrentFacilityId

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Phase 12-07 (facility switching API). The foundation is now in place:
- Claims helper returns facilityId
- Cookie helpers exist for read/write/clear operations
- detectUserFacility available for initial facility detection
