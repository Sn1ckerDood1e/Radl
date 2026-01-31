---
phase: 37-user-management
plan: 01
subsystem: admin-panel
tags: [admin, users, api, supabase]
dependency-graph:
  requires: [36-admin-foundation-auth]
  provides: [admin-users-api, user-list, user-detail, user-edit]
  affects: [37-02, 37-03]
tech-stack:
  added: []
  patterns: [admin-audit-logging, supabase-admin-client]
key-files:
  created:
    - src/app/api/admin/users/route.ts
    - src/app/api/admin/users/[userId]/route.ts
  modified:
    - src/lib/supabase/admin.ts
    - src/lib/audit/actions.ts
decisions:
  - name: Client-side search filtering
    rationale: Supabase Admin API lacks server-side search; filter after fetch
  - name: Paginated with membership join
    rationale: Fetch auth users then join with Prisma memberships
metrics:
  duration: 6 minutes
  completed: 2026-01-31
---

# Phase 37 Plan 01: User Management API Summary

Super admin can list, search, view, and edit platform users via API endpoints.

## What Was Built

### 1. Supabase Admin Client Extensions (src/lib/supabase/admin.ts)
- **AdminUser interface**: Typed user data from Supabase Auth
- **listUsersWithPagination()**: Paginated user listing (page, perPage)
- **getUserById()**: Single user lookup by UUID
- **updateUserById()**: Profile updates (email, phone, display_name)

### 2. Users List API (GET /api/admin/users)
- Lists all platform users with pagination (25 per page default, 100 max)
- Search by email, displayName, facility name, club name
- Returns user memberships summary (facility count, club count)
- Includes facilities and clubs with roles
- Super admin only (getSuperAdminContext check)

Query parameters:
- `page`: Page number (1-indexed, default 1)
- `perPage`: Users per page (default 25, max 100)
- `search`: Search term for filtering

### 3. User Detail API (GET /api/admin/users/[userId])
- Returns detailed user information
- Includes all facility memberships with roles
- Includes all club memberships with roles and facility association
- Includes legacy team memberships (backward compatibility)
- Shows provider, ban status, email confirmation status

### 4. User Edit API (PATCH /api/admin/users/[userId])
- Updates user profile: displayName, email, phone
- Validates input with Zod schema
- Audit logs with before/after state capture
- Uses ADMIN_USER_UPDATED action

### 5. Audit Action Addition
- Added `ADMIN_USER_UPDATED` action to audit actions
- Full before/after state tracking for profile changes

## Implementation Notes

### Authentication Pattern
All endpoints use `getSuperAdminContext()` which:
1. Validates user is authenticated via Supabase
2. Queries SuperAdmin table to verify platform-level access
3. Returns null for non-admins (API returns 401)

### Data Aggregation Approach
Since Supabase Auth and Prisma are separate data stores:
1. Fetch users from Supabase Auth (listUsersWithPagination)
2. Batch fetch memberships from Prisma for all user IDs
3. Group memberships by userId using Maps
4. Join data in application layer

### Search Implementation
Supabase Admin API doesn't support server-side search, so:
1. Fetch full page of users from Supabase
2. Fetch memberships for those users from Prisma
3. Apply client-side filter on email, displayName, facility/club names
4. Note: Search only filters current page, not all users

## Commits

| Hash | Message |
|------|---------|
| 587efb6 | feat(37-01): extend Supabase admin client with user management functions |
| 3a0c472 | feat(37-01): add users list API with pagination and search |
| 5818107 | feat(37-01): add user detail and edit API |

## Verification

- [x] Super admin can list all platform users with pagination
- [x] Super admin can search users by email, name, facility, or club
- [x] Super admin can view individual user details with memberships
- [x] Super admin can edit user profile (name, email, phone)
- [x] All mutations logged to audit log with before/after state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] POST handler already existed in route.ts**
- **Found during:** Task 2
- **Issue:** The users route.ts file already had a POST handler from a previous commit
- **Fix:** Added GET handler to existing file instead of creating new file
- **Files modified:** src/app/api/admin/users/route.ts

## Next Phase Readiness

Ready for 37-02 (User Create UI) - API endpoints complete:
- GET /api/admin/users (list with pagination/search)
- GET /api/admin/users/[userId] (detail)
- PATCH /api/admin/users/[userId] (edit)
- POST /api/admin/users (create - already existed from prior work)
