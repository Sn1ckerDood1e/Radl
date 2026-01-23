---
phase: 11-mfa-sso
plan: 01
subsystem: database
tags: [prisma, mfa, sso, backup-codes, permission-grant]

# Dependency graph
requires:
  - phase: 10-security
    provides: Role enum, ClubMembership model, AuditLog model
provides:
  - MfaBackupCode model for SHA-256 hashed backup code storage
  - PermissionGrant model for temporary elevated access with expiration
  - SsoConfig model for facility-level SSO/SAML configuration
affects: [11-02, 11-03, 11-04, 11-05, 11-08, 11-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA-256 hashed backup codes with unique constraint on userId+codeHash"
    - "Temporary permission grants with expiration tracking"
    - "JSON role mappings for flexible IDP integration"

key-files:
  created: []
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Backup codes hashed with SHA-256, stored with unique constraint per user"
  - "Permission grants are time-bounded with revocation support"
  - "SSO config is facility-scoped with role mapping stored as JSON array"

patterns-established:
  - "MFA backup codes: 10 codes per user, SHA-256 hash, one-time use"
  - "Permission grants: explicit expiration, soft revocation via revokedAt"
  - "SSO role mapping: JSON array of { idpValue, rowopsRoles } objects"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 11 Plan 01: Database Schema Summary

**Prisma schema extended with MfaBackupCode, PermissionGrant, and SsoConfig models for MFA backup storage, temporary elevated access, and facility-level SSO configuration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T16:00:00Z
- **Completed:** 2026-01-23T16:04:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- MfaBackupCode model with SHA-256 hashing and unique userId+codeHash constraint
- PermissionGrant model with time-bounded elevated access and soft revocation
- SsoConfig model with facility-level SSO settings and flexible JSON role mappings
- Database schema pushed and Prisma client regenerated with new types

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MfaBackupCode and PermissionGrant models** - `b4830ad` (feat)
2. **Task 2: Add SsoConfig model** - `b5a7908` (feat)
3. **Task 3: Generate Prisma client and push schema** - No commit (generated files gitignored, db push is runtime)

**Plan metadata:** (pending)

## Files Created/Modified
- `prisma/schema.prisma` - Added MfaBackupCode, PermissionGrant, SsoConfig models with indexes

## Decisions Made
- Backup codes use SHA-256 hashing (consistent with API key pattern from Phase 10)
- PermissionGrant tracks both expiresAt and revokedAt for flexible access control
- SsoConfig uses JSON for roleMappings to support flexible IDP value mapping
- facilityId in SsoConfig maps to Team.id (current schema) for forward compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Database foundation complete for MFA backup codes (Plan 02-04)
- Database foundation complete for temporary permissions (Plan 05)
- Database foundation complete for SSO configuration (Plan 08-09)
- Ready for backup code generation and verification APIs

---
*Phase: 11-mfa-sso*
*Completed: 2026-01-23*
