# Feature Landscape: Super-Admin Panel

**Domain:** SaaS Platform Administration (Multi-Tenant)
**Researched:** 2026-01-30
**Confidence:** HIGH (based on industry patterns verified across multiple sources)

## Context

Radl is a rowing team management SaaS with an existing hierarchy:
- **Facility** (boathouse) -> **Club** (team) -> **Members**
- Existing roles: FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT
- Users currently self-signup via Supabase Auth with email verification
- Invitation system exists (email invites, join codes)

This admin panel adds **SUPER_ADMIN** capabilities for platform owners to manage:
- Users (bypassing self-signup)
- Facilities and Clubs
- Memberships across the platform
- Password resets without user involvement

---

## Table Stakes

Features users expect. Missing = admin panel feels incomplete or unusable.

### User Management

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **List all users** | Core visibility into platform users | Low | None | Paginated, searchable. Must show email, name, status, created date |
| **Create user (bypass signup)** | Primary use case for admin panel | Medium | Supabase Admin API | Admin creates user with email/password, user is pre-verified |
| **Edit user profile** | Correct mistakes, update info | Low | Existing profile fields | Name, email, phone. NOT password (separate action) |
| **View user details** | See full user context | Low | None | Memberships, activity, created date, last login |
| **Deactivate user** | Remove access without data loss | Low | Add `isActive` flag or `status` enum | Soft disable - preserves data, blocks login |
| **Reactivate user** | Undo deactivation | Low | Deactivation feature | Simple toggle back to active |
| **Reset password (admin-initiated)** | Support workflow | Medium | Supabase Admin API | Generates reset email OR sets temporary password |
| **Search/filter users** | Find specific users quickly | Low | None | By email, name, facility, club, role |

### Facility Management

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **List all facilities** | Platform visibility | Low | None | Name, slug, club count, member count |
| **Create facility** | Admin-created organizations | Low | None | Name, slug, location, contact info |
| **Edit facility** | Update details | Low | None | All editable fields |
| **View facility details** | See clubs, members, settings | Low | None | Dashboard-style view |
| **Delete facility** | Remove defunct orgs | Medium | Cascade handling | Soft delete with confirmation. Handle clubs/members |

### Club Management

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **List all clubs** | Platform visibility | Low | None | Within facility or global view |
| **Create club** | Admin-created teams | Low | Facility exists | Name, facility assignment, colors |
| **Edit club** | Update details | Low | None | Name, colors, settings |
| **View club details** | See members, equipment, settings | Low | None | Dashboard-style view |
| **Move club between facilities** | Organizational changes | Medium | Both facilities exist | Update facilityId, verify no conflicts |
| **Delete club** | Remove defunct teams | Medium | Cascade handling | Soft delete preferred |

### Membership Management

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Add user to club** | Direct membership assignment | Low | User + Club exist | Assign role(s), skip invitation flow |
| **Remove user from club** | Revoke membership | Low | Membership exists | Immediate removal |
| **Change user role in club** | Adjust permissions | Low | Membership exists | Update role array |
| **View all memberships for user** | Cross-org visibility | Low | None | List all clubs user belongs to |
| **Bulk add users to club** | Efficiency for onboarding | Medium | CSV parsing | CSV upload with email + role |

### Authentication and Security

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Admin login (separate flow)** | Isolated admin access | Medium | Auth setup | Separate login page/domain or flag-based |
| **Admin session timeout** | Security requirement | Low | Session config | Shorter timeout than regular users (30 min) |
| **Admin action audit logging** | Compliance, debugging | Low | AuditLog model exists | All CRUD actions logged with actor |

---

## Differentiators

Features that set the admin panel apart. Not expected, but valued when present.

### Enhanced User Management

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **User impersonation** | Debug/support without password sharing | High | Requires audit trail, visual indicator, session timeout, action restrictions |
| **Bulk user creation (CSV)** | Onboard many users at once | Medium | Validate emails, handle errors, send welcome emails |
| **Account state management** | Suspend vs Deactivate vs Delete | Medium | Suspension = temporary block, Deactivation = long-term, Delete = permanent |
| **Force password change on next login** | Security policy enforcement | Low | Flag user, force reset on next auth |
| **View login history** | Security monitoring | Medium | Requires logging auth events |
| **Unlock account** | After failed login lockout | Low | Clear lockout counter |

### Advanced Auditing

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Audit log viewer** | See all admin actions | Medium | Filterable by action, actor, target, date |
| **Audit log export (CSV)** | Compliance requirements | Low | Date range filter, download |
| **Audit log search** | Find specific events | Medium | Full-text search on metadata |

### Facility/Club Management

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Facility dashboard** | At-a-glance metrics | Medium | User count, club count, activity |
| **Club statistics** | Usage insights | Medium | Active users, equipment count, practices |
| **Merge facilities** | Handle org consolidation | High | Move all clubs, update references |
| **Facility suspension** | Billing/compliance issues | Medium | Block all logins for facility |

### Communication

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Send welcome email** | Manual trigger for admin-created users | Low | Template email with login instructions |
| **Platform announcement** | Broadcast to all users | Medium | New notification type, targeting |
| **Email users** | Direct communication | Medium | Template system, delivery tracking |

### Security Enhancements

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **IP allowlist for admin access** | Restrict admin panel by IP | Medium | Middleware check |
| **Admin MFA enforcement** | Extra security for admin accounts | Medium | Require TOTP/WebAuthn |
| **Session management** | View/revoke active sessions | Medium | Track sessions, force logout |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in admin panels.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Embedded in main app routes** | Security risk: admin routes detectable in client bundles, access control complexity, harder to isolate during incidents | Separate admin panel communicating via private API, or clearly isolated route group with strict middleware |
| **God-mode data access** | Super admin seeing all user data (practices, lineups, messages) violates privacy, increases liability | Super admin manages structure (users, orgs, memberships), not operational content |
| **Direct database editing** | Bypasses validation, audit logging, business logic | All changes through proper API endpoints with validation |
| **Permanent hard delete without confirmation** | Data loss, orphaned references, compliance issues | Soft delete first (30-day grace period), then hard delete with background job |
| **Shared admin credentials** | No accountability, security nightmare, compliance failure | Individual admin accounts with audit trail for every action |
| **Admin actions without audit** | No accountability, compliance failure, impossible to debug | Log every mutation with actor, timestamp, IP, before/after state |
| **Impersonation without restrictions** | Admin could change passwords, delete accounts, access sensitive data while impersonating | Block sensitive actions during impersonation, visible indicator, short timeout |
| **Bulk operations without preview** | Mass mistakes are catastrophic and hard to reverse | Preview changes before applying, confirmation step, undo capability where possible |
| **Password in plain text anywhere** | Security 101 violation | Always use Supabase Admin API for password operations, never log passwords |
| **Over-feature the first release** | Delays launch, adds complexity, may build wrong things | Start with table stakes, iterate based on actual usage patterns |
| **Simple binary admin check** | "isAdmin" field is anti-pattern for enterprise. Customers need fine-grained access | Role-based system with principle of least privilege |

---

## Feature Dependencies

```
Create User ────────────────────────────────────────────────┐
                                                            v
Create Facility ───────> Create Club ───────> Add Membership
                                                            │
                                                            v
                                              Change Role / Remove Member
```

**Critical path for MVP:**
1. Super Admin authentication (must be able to log in)
2. Create User (Supabase Admin API integration)
3. Create Facility, Create Club
4. Add Membership (connect user to club with role)
5. Password Reset (support workflow)

**Everything else builds on this foundation.**

---

## Account State Model

Based on industry patterns (Okta, Google Workspace, Microsoft Entra):

| State | Access | Data | Can Reactivate | Billing | Use Case |
|-------|--------|------|----------------|---------|----------|
| **Active** | Yes | Yes | N/A | Yes | Normal operation |
| **Suspended** | No | Yes | Yes | Often Yes | Temporary block (investigation, payment issue) |
| **Deactivated** | No | Yes | Yes | No | Long-term inactive (left organization) |
| **Deleted** | No | Soft-deleted | Within grace period | No | Account closure request |
| **Hard Deleted** | No | Gone | No | No | After retention period or GDPR request |

**MVP Recommendation:** Start with Active/Deactivated only. Add Suspended later if needed.

---

## MVP Recommendation

### Phase 1: Core Admin CRUD (Table Stakes)

**Must have for functional admin panel:**

1. **Authentication**
   - Super Admin login (can use existing Supabase Auth with role check)
   - Session timeout (30 min inactivity)

2. **User Management**
   - List users (paginated, searchable)
   - Create user (email + temporary password, pre-verified)
   - View user details
   - Deactivate/Reactivate user
   - Reset password (send reset email)

3. **Facility Management**
   - List facilities
   - Create facility
   - Edit facility
   - View facility (with clubs)

4. **Club Management**
   - List clubs (within facility)
   - Create club
   - Edit club
   - View club (with members)

5. **Membership Management**
   - Add user to club with role
   - Remove user from club
   - Change user role

6. **Audit Logging**
   - Log all admin actions (model already exists)
   - Basic audit log viewer

### Defer to Post-MVP

| Feature | Reason to Defer |
|---------|-----------------|
| User impersonation | High complexity, security considerations |
| Bulk user creation | Nice-to-have efficiency |
| Advanced account states (suspend) | Deactivate is sufficient for MVP |
| Facility merge | Edge case, can do manually |
| IP allowlisting | Can add when needed |
| Audit log export | Viewer is sufficient initially |
| Platform announcements | Existing notification system works |
| Login history | Not critical for core workflow |

---

## Implementation Notes

### Supabase Admin API Integration

Creating users requires Supabase Admin API (service role key):
- `supabase.auth.admin.createUser()` - creates pre-verified user
- `supabase.auth.admin.updateUserById()` - update email/metadata
- `supabase.auth.admin.deleteUser()` - hard delete from auth
- `supabase.auth.admin.generateLink()` - password reset link

**Security consideration:** Service role key must be server-side only, never exposed to client.

### Super Admin Role

Two options:
1. **Add to Role enum:** `SUPER_ADMIN` role, stored in user metadata
2. **Separate table:** `SuperAdmin` model with userId

**Recommendation:** Store `SUPER_ADMIN` in Supabase user `app_metadata.role`. This keeps it:
- Out of tenant-scoped tables (super admin is platform-level, not club-level)
- Accessible in JWT claims for middleware checks
- Managed via Supabase Admin API

```typescript
// Check in middleware
const user = await supabase.auth.getUser()
const isSuperAdmin = user.data.user?.app_metadata?.role === 'SUPER_ADMIN'
```

### Soft Delete Strategy

**For users:**
- Add `status` field to a new `UserProfile` table or rely on Supabase auth `banned` field
- Deactivated users cannot log in but data is preserved
- Hard delete removes from auth system (GDPR compliance)

**For facilities/clubs:**
- Add `deletedAt` timestamp field
- Soft deleted entities hidden from lists but data preserved
- Hard delete requires entity to be empty (no members/clubs)

### Existing Schema Leverage

The current schema already has:
- `AuditLog` model - can be reused for admin actions
- `Facility`, `Team` (Club), `FacilityMembership`, `ClubMembership` models
- `Role` enum (FACILITY_ADMIN, CLUB_ADMIN, COACH, ATHLETE, PARENT)

**Additions needed:**
- Super admin storage (app_metadata)
- User status/deactivation field
- Admin-specific API routes
- Admin UI pages

---

## Sources

- [Zluri - SaaS User Management Guide 2026](https://www.zluri.com/blog/saas-user-management)
- [WeWeb - Admin Dashboard Ultimate Guide 2026](https://www.weweb.io/blog/admin-dashboard-ultimate-guide-templates-examples)
- [Frontegg - User Management Guide](https://frontegg.com/guides/user-management)
- [WorkOS - User Management Features for SaaS](https://workos.com/blog/user-management-features)
- [Logto - Build Multi-Tenant SaaS Application](https://blog.logto.io/build-multi-tenant-saas-application)
- [Enterprise Ready - Role Based Access Control](https://www.enterpriseready.io/features/role-based-access-control/)
- [Enterprise Ready - Audit Logging](https://www.enterpriseready.io/features/audit-log/)
- [Aikido - Secure Admin Panel](https://www.aikido.dev/blog/build-secure-admin-panel)
- [StrongDM - NIST Password Guidelines 2026](https://www.strongdm.com/blog/nist-password-guidelines)
- [Authress - User Impersonation Risks](https://authress.io/knowledge-base/academy/topics/user-impersonation-risks)
- [Medium - Soft Delete vs Hard Delete Best Practices](https://surajsinghbisht054.medium.com/understanding-soft-delete-and-hard-delete-in-software-development-best-practices-and-importance-539a935d71b5)
- [Okta - Deactivate and Delete User Accounts](https://help.okta.com/en-us/content/topics/users-groups-profiles/usgp-deactivate-user-account.htm)
- [Microsoft Entra - Bulk Create Users](https://learn.microsoft.com/en-us/entra/identity/users/users-bulk-add)
- [Frontegg - Audit Logs for SaaS Enterprise Customers](https://frontegg.com/blog/audit-logs-for-saas-enterprise-customers)
- [Chris Dermody - Audit Logging Best Practices](https://chrisdermody.com/best-practices-for-audit-logging-in-a-saas-business-app/)
