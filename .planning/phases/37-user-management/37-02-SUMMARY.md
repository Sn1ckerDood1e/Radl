---
phase: 37-user-management
plan: 02
subsystem: admin-panel
tags: [admin, users, api, supabase, account-management]
dependency-graph:
  requires: [37-01]
  provides: [user-deactivate, user-reactivate, password-reset]
  affects: [37-03, 37-04]
tech-stack:
  added: []
  patterns: [supabase-ban-duration, admin-password-reset]
key-files:
  created:
    - src/app/api/admin/users/[userId]/deactivate/route.ts
    - src/app/api/admin/users/[userId]/reactivate/route.ts
    - src/app/api/admin/users/[userId]/reset-password/route.ts
  modified: []
decisions:
  - name: 100-year ban duration for deactivation
    rationale: "876000h provides permanent-ish ban while remaining reversible"
  - name: Block password reset for deactivated users
    rationale: Security measure to prevent password reset on banned accounts
metrics:
  duration: 15 minutes
  completed: 2026-01-31
---

# Phase 37 Plan 02: User Lifecycle Management API Summary

Super admin can create users, deactivate/reactivate accounts, and send password reset emails.

## What Was Built

### 1. POST Create User (Task 1 - Already Existed from 37-01)

The POST /api/admin/users endpoint was already implemented in 37-01:
- Creates user via Supabase auth.admin.createUser()
- Sends password setup email via inviteUserByEmail()
- Logs ADMIN_USER_CREATED to audit trail
- Validates email format, checks for duplicates (409 Conflict)

### 2. Deactivate Endpoint (POST /api/admin/users/[userId]/deactivate)

Blocks user login by setting a Supabase ban:
- Sets `ban_duration: '876000h'` (100 years - effectively permanent but reversible)
- Returns 400 if user already deactivated
- Logs ADMIN_USER_DEACTIVATED with before/after state
- Returns user status with bannedUntil timestamp

```typescript
// Key implementation
await supabase.auth.admin.updateUserById(userId, {
  ban_duration: '876000h',
});
```

### 3. Reactivate Endpoint (POST /api/admin/users/[userId]/reactivate)

Restores login ability by removing ban:
- Sets `ban_duration: 'none'` to clear the ban
- Returns 400 if user is not deactivated
- Logs ADMIN_USER_REACTIVATED with before/after state
- Returns user status confirmation

```typescript
// Key implementation
await supabase.auth.admin.updateUserById(userId, {
  ban_duration: 'none',
});
```

### 4. Password Reset Endpoint (POST /api/admin/users/[userId]/reset-password)

Sends password recovery email to user:
- Uses Supabase auth.admin.generateLink() with type: 'recovery'
- Falls back to resetPasswordForEmail() if generateLink fails
- Returns 400 if user is deactivated (security measure)
- Returns 400 if user has no email
- Logs ADMIN_PASSWORD_RESET to audit trail

```typescript
// Key implementation
await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: user.email,
  options: { redirectTo: `${appUrl}/reset-password` },
});
```

## Implementation Notes

### Supabase Ban Duration Format
Supabase uses a string duration format for bans:
- `'876000h'` = ~100 years (hours)
- `'none'` = remove ban
- Other valid formats: `'24h'`, `'7d'`, `'30d'`

### Security Decisions

1. **Deactivated users cannot reset password**: Must reactivate first. Prevents password reset on banned accounts.

2. **UUID validation**: All endpoints validate userId format before database queries.

3. **Audit logging**: All state changes logged with before/after state for compliance.

### Error Handling

| Status | Condition |
|--------|-----------|
| 400 | Already deactivated (deactivate), not deactivated (reactivate), deactivated (reset-password), no email |
| 401 | Not authenticated or not super admin |
| 404 | User not found, invalid UUID |
| 500 | Supabase API error |

## Commits

| Hash | Message |
|------|---------|
| 35bec8f | feat(37-02): add user deactivate and reactivate endpoints |
| 0546437 | feat(37-02): add admin password reset endpoint |

## Verification

- [x] Super admin can create a new user without self-signup (via 37-01)
- [x] Created user receives password setup email (inviteUserByEmail)
- [x] Super admin can deactivate a user blocking their login
- [x] Super admin can reactivate a deactivated user
- [x] Super admin can send password reset link to user
- [x] All endpoints return 401 for non-admin users
- [x] All actions logged to audit log with before/after state

## Deviations from Plan

None - plan executed as designed. Task 1 (POST Create User) was already implemented in 37-01.

## Next Phase Readiness

Ready for 37-03 (User Management UI):
- Full CRUD API complete for users
- Deactivate/reactivate flow ready
- Password reset flow ready
- All endpoints follow consistent patterns
