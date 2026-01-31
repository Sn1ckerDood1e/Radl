# Research Summary: v3.1 Admin Panel

**Milestone:** v3.1 Admin Panel for Radl
**Goal:** Platform owner can manage users, clubs, and memberships through super-admin panel
**Synthesized:** 2026-01-30
**Overall Confidence:** HIGH

---

## Executive Summary

Building a super-admin panel for Radl is a **low-complexity extension** of the existing architecture. The current stack (Next.js 16, Supabase Auth, Prisma 6, CASL) already provides all necessary infrastructure. No new dependencies required.

The recommended approach is a **separate `(admin)` route group** with database-verified super-admin access (not JWT-cached), using the existing Supabase Admin API for user management. The critical innovation is keeping super-admin status in a dedicated `SuperAdmin` table rather than JWT claims, ensuring immediate access revocation and preventing token hijacking from granting admin access.

Key risks center on **RLS bypass without audit trails** and **tenant context leakage**. Both are mitigated through established patterns: wrapping all service-role operations in audit logging middleware, and forcing page reloads on tenant context switches. The existing `getSupabaseAdmin()` client and `AuditLog` model provide the foundation.

---

## Key Findings

### From STACK.md

| Technology | Decision | Rationale |
|------------|----------|-----------|
| **Super Admin Storage** | `SuperAdmin` database table + `is_super_admin` JWT claim | Platform-level role, separate from 5-role tenant hierarchy |
| **User Creation** | `auth.admin.createUser()` + `generateLink('recovery')` | Direct creation with password setup link, no SMTP dependency |
| **CASL Extension** | `can('manage', 'all')` pattern | Super admin bypasses all CASL checks |
| **No New Dependencies** | None required | Existing stack handles everything |

**Password Flow Recommendation:** Admin creates user, generates recovery link, delivers link (email/display). User sets own password. Works without SMTP configuration.

### From FEATURES.md

**Table Stakes (Must Have):**
- List/create/edit/deactivate users (bypass signup)
- List/create/edit facilities and clubs
- Add/remove/change user memberships and roles
- Admin password reset (send reset email or generate link)
- Audit logging for all admin actions
- Admin session timeout (30 min recommended)

**Differentiators (Nice to Have):**
- User impersonation (high complexity, defer)
- Bulk user creation via CSV
- Audit log export
- Platform-wide announcements

**Anti-Features (Do Not Build):**
- God-mode data access to user content (practices, lineups)
- Direct database editing bypassing validation
- Shared admin credentials
- Impersonation without restrictions

**Account State Model (MVP):** Active/Deactivated only. Add Suspended later if needed.

### From ARCHITECTURE.md

**Route Structure:**
```
src/app/
├── (auth)/              # Existing
├── (dashboard)/         # Existing tenant-scoped
├── (admin)/             # NEW: Super admin panel
│   ├── layout.tsx       # Admin auth check, no tenant context
│   ├── users/
│   ├── facilities/
│   ├── clubs/
│   └── audit-logs/
└── api/admin/           # NEW: Admin-only API routes
```

**Key Architecture Decisions:**

1. **Separate Route Group:** `(admin)` isolated from `(dashboard)` - different layout, no tenant context switcher, no team colors
2. **Database-Verified Access:** Query `SuperAdmin` table on every request, NOT JWT claims
3. **RLS Bypass Strategy:** Use regular Prisma (already bypasses RLS) for cross-tenant queries, `getSupabaseAdmin()` only for auth operations
4. **No AbilityProvider in Admin:** Super admin has full access; tenant-scoped CASL context not applicable

**Anti-Patterns to Avoid:**
- JWT-based super admin check (stale until token expires)
- Reusing dashboard layout (expects tenant context)
- Tenant-scoped Prisma in admin routes
- Sharing AbilityProvider context

### From PITFALLS.md

**Critical Pitfalls:**

| Pitfall | Severity | Prevention |
|---------|----------|------------|
| **RLS Bypass Without Audit** | Critical | Wrap all service-role operations in `logSuperAdminAction()` middleware |
| **Tenant Context Leakage** | Critical | Force page reload on tenant switch, include tenantId in every mutation |
| **Privilege Escalation** | Critical | Separate "create user" from "assign roles" flows, audit role elevation events |
| **Service Role Key Exposure** | Critical | ESLint rule to flag `createClient` in client files, CI check for secrets in bundles |
| **Impersonation Without Safeguards** | Critical | If implemented: 30-min timeout, dual logging, visible banner, read-only default |

**Moderate Pitfalls:**
- N+1 queries in multi-tenant dashboards (pagination required)
- RLS helpers return NULL for super-admin (add `is_super_admin()` helper)
- Admin actions without confirmation (typed confirmation for destructive ops)
- Missing rate limiting on admin endpoints

**Phase-Specific Warnings:**
- Phase 1: Establish audit infrastructure before any admin actions
- Phase 2: Pagination mandatory, context reset on tenant switch
- Phase 3: Role hierarchy enforcement for user creation
- Phase 4: Impersonation needs separate session type if implemented

---

## Implications for Roadmap

### Suggested Phase Structure

**Phase 1: Foundation & Auth (Core Infrastructure)**
- Add `SuperAdmin` table to schema
- Update access token hook with `is_super_admin` claim
- Create `admin-authorize.ts` with `requireSuperAdmin()`, `isSuperAdmin()`
- Extend CASL ability with super-admin handling
- Establish audit logging pattern for admin actions
- Create `(admin)` route group with protected layout
- Add `/api/admin/*` route structure

**Rationale:** All subsequent phases depend on auth infrastructure being solid. Audit logging must exist before any mutations are possible.

**Delivers:** Super admin can log in, see admin dashboard, basic navigation. No CRUD yet.

**Must Avoid:** Pitfalls 1 (audit), 4 (key exposure)

---

**Phase 2: User Management (Primary Use Case)**
- List all users (paginated, searchable)
- Create user with password setup link
- View user details with membership summary
- Deactivate/reactivate user
- Reset password (generate recovery link)
- Search/filter by email, name, facility, club

**Rationale:** User creation is the primary driver for the admin panel. Depends on Phase 1 auth and audit infrastructure.

**Delivers:** Admin can create users bypassing signup, manage access.

**Must Avoid:** Pitfalls 3 (privilege escalation), 6 (N+1 queries)

---

**Phase 3: Facility & Club Management**
- List all facilities with club counts
- Create/edit facility
- List all clubs across facilities
- Create/edit club (assign to facility)
- View facility/club details with member counts

**Rationale:** Once users exist, they need to be placed in organizational structure.

**Delivers:** Admin can set up entire organizational hierarchy.

**Must Avoid:** Pitfall 2 (tenant context leakage), 10 (inconsistent visibility)

---

**Phase 4: Membership Management**
- Add user to club with role(s)
- Remove user from club
- Change user roles within club
- View all memberships for a user (cross-org)
- Bulk add users to club (CSV)

**Rationale:** Connects users to clubs. Depends on both user and club management being complete.

**Delivers:** Full membership lifecycle management.

**Must Avoid:** Pitfall 3 (role assignment bypassing validation)

---

**Phase 5: Audit & Analytics (Operational Visibility)**
- Audit log viewer (filterable by action, actor, target)
- Export audit logs (CSV)
- Platform analytics dashboard (user count, club count, activity metrics)

**Rationale:** Polish phase. Core CRUD complete, now add visibility and compliance features.

**Delivers:** Compliance-ready audit trail, platform health dashboard.

**Must Avoid:** Pitfall 6 (N+1 queries in analytics)

---

### Feature-to-Phase Mapping

| Feature | Phase | Complexity |
|---------|-------|------------|
| Super admin auth | 1 | Low |
| Audit logging infrastructure | 1 | Medium |
| List/create users | 2 | Medium |
| User deactivate/reactivate | 2 | Low |
| Password reset | 2 | Low |
| Facility CRUD | 3 | Low |
| Club CRUD | 3 | Low |
| Add/remove memberships | 4 | Low |
| Change user roles | 4 | Low |
| Bulk user add (CSV) | 4 | Medium |
| Audit log viewer | 5 | Medium |
| Platform analytics | 5 | Medium |

### Research Flags

| Phase | Needs Research? | Notes |
|-------|-----------------|-------|
| Phase 1 | No | Well-documented patterns in Supabase docs |
| Phase 2 | No | Supabase Admin API is straightforward |
| Phase 3 | No | Standard CRUD with existing Prisma patterns |
| Phase 4 | Possibly | Bulk CSV import may need validation research |
| Phase 5 | No | Audit pattern established in Phase 1 |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | No new dependencies, verified with official Supabase docs |
| **Features** | HIGH | Industry patterns verified across Frontegg, WorkOS, Okta sources |
| **Architecture** | HIGH | Based on existing codebase analysis + Next.js route group patterns |
| **Pitfalls** | HIGH | Verified against Supabase RLS docs and 2026 security research |

### Gaps to Address During Planning

1. **Exact admin session timeout** - Config decision (15 vs 30 min)
2. **Soft delete retention period** - Business decision (30 days suggested)
3. **Admin MFA requirement** - Security policy decision
4. **Impersonation scope** - Defer or include in v3.1?

---

## Sources (Aggregated)

### Official Documentation
- [Supabase createUser API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase generateLink API](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Supabase Service Role Security](https://supabase.com/docs/guides/api/api-keys)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [CASL Super Admin Pattern](https://github.com/stalniy/casl/issues/119)

### Industry Best Practices
- [Frontegg - User Management Guide](https://frontegg.com/guides/user-management)
- [WorkOS - User Management Features for SaaS](https://workos.com/blog/user-management-features)
- [Enterprise Ready - RBAC](https://www.enterpriseready.io/features/role-based-access-control/)
- [Enterprise Ready - Audit Logging](https://www.enterpriseready.io/features/audit-log/)
- [Aikido - Secure Admin Panel](https://www.aikido.dev/blog/build-secure-admin-panel)

### Security Research
- [Multi-Tenant RLS Failures](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Cross-Tenant Data Leaks](https://danaepp.com/cross-tenant-data-leaks-ctdl-why-api-hackers-should-be-on-the-lookout)
- [Building Secure Impersonation](https://medium.com/@codebyzarana/building-a-secure-user-impersonation-feature-for-multi-tenant-enterprise-applications-21e79476240c)
- [Okta - Account Management](https://help.okta.com/en-us/content/topics/users-groups-profiles/usgp-deactivate-user-account.htm)

---

## Ready for Roadmap

Research complete. Key recommendations:

1. **5 phases** covering foundation through analytics
2. **No new dependencies** - leverage existing stack
3. **Database-verified auth** - not JWT claims for super admin
4. **Audit-first** - establish logging before any mutations
5. **Defer impersonation** - complexity outweighs value for v3.1
