---
phase: 37
plan: 03
subsystem: admin-ui
tags: [admin, users, table, search, pagination, dropdown]
dependency-graph:
  requires: ["37-01", "37-02"]
  provides: ["admin-users-list-ui", "user-actions-dropdown"]
  affects: ["37-04", "37-05"]
tech-stack:
  added: []
  patterns: ["server-component-fetch", "url-search-params", "debounced-search"]
key-files:
  created:
    - src/app/(admin)/admin/users/page.tsx
    - src/app/(admin)/admin/users/loading.tsx
    - src/components/admin/users/user-list-table.tsx
    - src/components/admin/users/user-search.tsx
    - src/components/admin/users/user-actions-dropdown.tsx
    - src/hooks/use-debounced-callback.ts
  modified:
    - src/app/(admin)/layout.tsx
decisions:
  - id: url-based-pagination
    date: 2026-01-31
    outcome: URL search params for pagination/search enables bookmarkable states
  - id: server-component-fetch
    date: 2026-01-31
    outcome: Server component fetches via internal API with forwarded cookies
  - id: sonner-in-admin-layout
    date: 2026-01-31
    outcome: Added Toaster to admin layout for toast notifications
metrics:
  duration: "5 minutes"
  completed: 2026-01-31
---

# Phase 37 Plan 03: Admin Users List UI Summary

Server-side paginated user list with debounced search and row-level actions dropdown

## What Was Built

### Admin Users List Page (`/admin/users`)
- **Server component** fetches users from internal API with forwarded auth cookies
- Displays paginated list (25 users per page)
- Shows user email, name, status badge, membership count, created date, last login
- Header displays total user count with "Create User" button
- Pagination controls (Previous/Next) preserve search params

### User List Table Component
- Client component renders table with sortable columns
- Status badges: Active (green), Unverified (yellow)
- Membership count shows combined facility + club count with tooltip
- Empty state when no users found
- Hover highlight on rows

### User Search Component
- Client component with debounced input (300ms)
- Updates URL search params for server-side filtering
- Resets to page 1 when search changes
- Clear button when search has value
- Visual loading indicator during navigation

### User Actions Dropdown
- Per-row dropdown with actions: View Details, Edit, Reset Password, Deactivate, Reactivate
- **Deactivate** shows confirmation dialog before action
- Actions call existing API endpoints from 37-02
- Toast notifications (sonner) for success/error feedback
- Loading states prevent double-submission

### Supporting Infrastructure
- `useDebouncedCallback` hook for reusable debounce logic
- Admin layout updated with `<Toaster>` for toast support

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 7c86daf | feat | Add admin users list page with loading state |
| 4d28a33 | feat | Add user list table and search components |
| 9a2dc5f | feat | Add user actions dropdown with confirmation dialogs |

## API Integration

The page integrates with 37-02 API endpoints:

| UI Action | API Endpoint | Method |
|-----------|--------------|--------|
| List users | `/api/admin/users` | GET |
| Reset password | `/api/admin/users/[userId]/reset-password` | POST |
| Deactivate | `/api/admin/users/[userId]/deactivate` | POST |
| Reactivate | `/api/admin/users/[userId]/reactivate` | POST |

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Server Component Fetch Pattern
```typescript
const cookieStore = await cookies();
const cookieHeader = cookieStore
  .getAll()
  .map((c) => `${c.name}=${c.value}`)
  .join('; ');

const response = await fetch(`${appUrl}/api/admin/users?${params}`, {
  headers: { Cookie: cookieHeader },
  cache: 'no-store',
});
```

### URL-Based State Management
Search and pagination use URL search params, enabling:
- Bookmarkable search results
- Browser back/forward navigation
- Server-side filtering without client state

## Next Phase Readiness

Ready for 37-04 (User Detail/Edit Page):
- [x] Users list page at /admin/users
- [x] Actions dropdown links to /admin/users/[id] and /admin/users/[id]/edit
- [x] API endpoints tested via dropdown actions
- [x] Toast infrastructure ready

## Verification Checklist

- [x] TypeScript compiles without errors in new files
- [x] page.tsx > 50 lines (193 lines)
- [x] UserListTable exports correctly
- [x] UserSearch exports correctly
- [x] UserActionsDropdown exports correctly
- [x] Page fetches from /api/admin/users
- [x] Table renders UserActionsDropdown per row
