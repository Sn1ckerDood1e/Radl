---
phase: 38
plan: 01
subsystem: admin-api
tags: [facility, admin, api, prisma, audit]
requires: [36, 37]
provides: [facility-crud-api, admin-facility-management]
affects: [38-02, 38-03, 39]
tech-stack:
  added: []
  patterns: [admin-api-pattern, cascade-delete-preview]
key-files:
  created:
    - src/lib/validations/facility.ts
    - src/app/api/admin/facilities/route.ts
    - src/app/api/admin/facilities/[facilityId]/route.ts
  modified:
    - src/lib/audit/actions.ts
decisions:
  - name: Cascade delete preview
    outcome: DELETE without confirm returns impact counts; with confirm=true performs delete
metrics:
  duration: 4m
  completed: 2026-01-31
---

# Phase 38 Plan 01: Facility Management API Summary

**One-liner:** Super admin facility CRUD API with auto-slug generation, aggregate stats, and cascade delete preview.

## What Was Built

### 1. Facility Validation Schemas (`src/lib/validations/facility.ts`)

Created Zod validation schemas for facility operations:

**createFacilitySchema:**
- name: required, 1-100 chars
- slug: optional (auto-generated), lowercase alphanumeric with hyphens, 1-50 chars
- address, city, state: optional location fields
- country: default 'US', max 2 chars
- timezone: default 'America/New_York'
- phone, email, website, description: optional contact/info fields

**updateFacilitySchema:**
- Partial version allowing nullable fields for clearing values

### 2. Facilities List & Create API (`src/app/api/admin/facilities/route.ts`)

**GET /api/admin/facilities (FCLT-01):**
- Lists all facilities with pagination (page, perPage)
- Search by name, city, state (case-insensitive)
- Returns aggregate stats: clubCount, memberCount per facility
- Super admin only via getSuperAdminContext()

**POST /api/admin/facilities (FCLT-02):**
- Creates facility with provided or auto-generated slug
- Handles slug collisions by appending suffix (-1, -2, etc.)
- Logs ADMIN_FACILITY_CREATED audit event
- Returns 201 with created facility

### 3. Facility Detail, Update, Delete API (`src/app/api/admin/facilities/[facilityId]/route.ts`)

**GET /api/admin/facilities/[id] (FCLT-04):**
- Returns facility with full details
- Includes nested clubs with member counts
- Aggregate stats: clubCount, memberCount, equipmentCount

**PATCH /api/admin/facilities/[id] (FCLT-03):**
- Updates facility with partial data
- Validates slug uniqueness on change
- Logs ADMIN_FACILITY_UPDATED with before/after state

**DELETE /api/admin/facilities/[id] (FCLT-05):**
- Without `?confirm=true`: Returns cascade impact preview
  - Counts: clubs, facilityMemberships, equipment, clubMemberships, practices, seasons
- With `?confirm=true`: Performs deletion with cascade
- Logs ADMIN_FACILITY_DELETED with cascade impact metadata

### 4. Audit Action Addition

Added `ADMIN_FACILITY_DELETED` to audit actions for tracking facility deletions.

## Architecture Patterns

- **Super admin authorization:** getSuperAdminContext() for API routes
- **Prisma direct access:** Bypasses RLS for admin operations
- **Audit logging:** createAdminAuditLogger with before/after state capture
- **Cascade delete preview:** Informative DELETE without confirm, destructive with confirm

## API Response Examples

```typescript
// GET /api/admin/facilities
{
  facilities: [{
    id, name, slug, city, state, country,
    clubCount: 5,
    memberCount: 42
  }],
  pagination: { page, perPage, total, totalPages }
}

// DELETE /api/admin/facilities/[id] (no confirm)
{
  facility: { id, name, slug },
  cascadeImpact: {
    clubs: 3,
    facilityMemberships: 5,
    equipment: 12,
    clubMemberships: 45,
    practices: 89,
    seasons: 6
  },
  message: "Add ?confirm=true to delete..."
}
```

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| FCLT-01 | List all facilities with stats | Done |
| FCLT-02 | Create facility with auto-slug | Done |
| FCLT-03 | Update facility details | Done |
| FCLT-04 | View facility detail with clubs | Done |
| FCLT-05 | Delete facility with cascade preview | Done |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 0fd69cd | feat(38-01): add facility validation schemas |
| 7744d3c | feat(38-01): add facility list and create API endpoints |
| 981289a | feat(38-01): add facility detail, update, and delete endpoints |

## Next Phase Readiness

**Unblocked:**
- 38-02: Club management API (can use same patterns)
- 38-03: Facility UI (has API endpoints ready)

**Dependencies met:**
- Facility CRUD fully operational
- Audit logging integrated
- Validation schemas exported
