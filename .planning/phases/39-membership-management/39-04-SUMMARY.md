---
phase: 39
plan: 04
subsystem: admin-panel
tags: [csv-import, bulk-operations, membership, admin]
requires: ["39-01", "39-03"]
provides: ["bulk-membership-import"]
affects: []
tech-stack:
  added: []
  patterns: ["csv-parser-hook", "bulk-api-with-results"]
key-files:
  created:
    - src/hooks/use-membership-csv-parser.ts
    - src/app/api/admin/clubs/[clubId]/members/bulk/route.ts
    - src/components/admin/memberships/bulk-membership-form.tsx
    - src/app/(admin)/admin/clubs/[clubId]/members/bulk/page.tsx
  modified:
    - src/lib/audit/actions.ts
    - src/components/admin/memberships/club-members-section.tsx
decisions: []
metrics:
  completed: "2026-01-31"
---

# Phase 39 Plan 04: Bulk Membership Import Summary

Bulk CSV import for adding multiple users to a club in one operation (MEMB-05).

## What Was Built

### 1. Membership CSV Parser Hook (useMembershipCSVParser)

Client-side CSV parsing with validation:
- Email column: required, validated format
- Role/roles column: optional, comma-separated for multi-role
- Default role: ATHLETE if not specified
- Valid roles: FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT
- Duplicate detection across rows
- Returns validRows, errors, duplicates separately

### 2. Bulk Membership API Endpoint

POST /api/admin/clubs/[clubId]/members/bulk:
- Super admin only (getSuperAdminContext)
- Max 100 members per batch
- Lookup users by email via Supabase Admin API
- For each member:
  - User not found: skip with reason
  - Already active with same roles: skip
  - Already active with different roles: update roles
  - Inactive membership: reactivate
  - New: create membership
- Audit log with ADMIN_MEMBERSHIPS_BULK_ADDED action
- Return detailed results with per-email status

### 3. Bulk Upload Page and Form

BulkMembershipForm component:
- CSV format guide (email, role columns)
- Drag-and-drop file upload
- Preview table (email, roles columns)
- Validation errors display
- Duplicate warning display
- Submit with loading state
- Results summary (4-column: added/updated/skipped/failed)
- Detailed results table with status and reason

Bulk upload page at /admin/clubs/[clubId]/members/bulk:
- Server component fetches club info
- Renders BulkMembershipForm

ClubMembersSection update:
- Added "Bulk Import" button next to "Add Member"
- Links to bulk upload page

## Key Technical Decisions

1. **Role validation in parser**: Invalid roles generate warnings but don't skip the row (defaults to ATHLETE)
2. **Email lookup via listUsers**: Fetches all users and builds email->userId map (efficient for <1000 users)
3. **Four-status model**: added/updated/skipped/failed covers all possible outcomes
4. **Reactivation support**: Inactive memberships are reactivated rather than creating duplicates

## Verification Results

1. `npm run build` - Completed without errors
2. Bulk Import button appears in ClubMembersSection header
3. Bulk upload page renders with CSV format guide
4. CSV parser validates emails and roles correctly
5. API returns proper status for each email

## Commits

| Commit | Description |
|--------|-------------|
| 26a9d7d | feat(39-04): add membership CSV parser hook |
| 5a9e0b4 | feat(39-04): add bulk membership API endpoint and audit action |
| 3ca9139 | feat(39-04): add bulk membership upload page and form |

## Deviations from Plan

None - plan executed exactly as written.

## Phase 39 Complete

All 4 plans in Phase 39 (Membership Management) are now complete:
- 39-01: Membership CRUD APIs
- 39-02: User detail memberships section
- 39-03: Club detail members section
- 39-04: Bulk CSV import

This completes the v3.1 Admin Panel milestone Phase 39. Only Phase 40 (Audit Log Viewer & Export) remains.
