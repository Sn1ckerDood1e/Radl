# Domain Pitfalls: Adding Super-Admin to Multi-Tenant SaaS

**Domain:** Super-admin panel for existing multi-tenant app (Radl)
**Context:** Facility -> Club -> Team hierarchy with RLS, 5-role RBAC, Supabase Auth
**Researched:** 2026-01-30
**Confidence:** HIGH (verified against Supabase docs and existing codebase)

---

## Critical Pitfalls

Mistakes that cause security vulnerabilities, data leakage, or major rewrites.

### Pitfall 1: RLS Bypass Without Audit Trail

**What goes wrong:** Super-admin uses service_role key to bypass RLS but actions are not logged. When something breaks or data is modified incorrectly, there's no forensic trail.

**Why it happens:**
- Service role key inherently bypasses RLS with no built-in logging
- Developers focus on "make it work" before "make it auditable"
- Supabase doesn't auto-log service role operations

**Consequences:**
- Compliance failures (SOC2, GDPR require audit trails for admin actions)
- No accountability for cross-tenant data modifications
- Cannot diagnose "who changed what" during incidents
- Customer trust issues if data discrepancies cannot be explained

**Warning signs:**
- Admin panel has "save" buttons but no audit middleware
- Service role client used directly without wrapper functions
- AuditLog table exists but super-admin actions don't populate it
- No admin session/action history visible in the app

**Prevention:**
1. **Never use service_role directly** - wrap in auditing middleware
2. Create `SuperAdminAuditLog` table with immutable policies (no UPDATE/DELETE)
3. Every admin operation must call `logSuperAdminAction()` before database mutation
4. Include: actor userId, impersonated userId (if any), IP, timestamp, action, before/after state
5. Use Supabase Edge Functions for admin operations to ensure logging cannot be bypassed

**Which phase should address:** Phase 1 (Foundation) - audit infrastructure must exist before any admin actions are possible.

**Code pattern:**
```typescript
// BAD: Direct service role usage
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
await supabaseAdmin.from('User').update({ role: 'ADMIN' }).eq('id', userId);

// GOOD: Wrapped with audit
async function superAdminUpdateUser(adminId: string, targetId: string, changes: object) {
  await logSuperAdminAction({
    adminId,
    action: 'USER_UPDATE',
    targetType: 'User',
    targetId,
    before: await getUser(targetId),
    changes,
    ipAddress: getClientIp(),
  });

  const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
  return supabaseAdmin.from('User').update(changes).eq('id', targetId);
}
```

---

### Pitfall 2: Tenant Context Leakage in Admin Views

**What goes wrong:** Admin panel shows data from multiple tenants in a single view. Developer accidentally includes tenant A's data in an action meant for tenant B, or session state "bleeds" between tenant switches.

**Why it happens:**
- Admin context switches between tenants frequently
- UI state persists across tenant navigation
- Caching (React Query, SWR) doesn't invalidate on tenant switch
- Form prefills carry over from previous tenant context

**Consequences:**
- Cross-tenant data modification (editing wrong tenant's data)
- Data leakage in exports/reports
- Actions applied to wrong tenant silently
- Customer data exposed to other customers (breach)

**Warning signs:**
- Admin can switch tenants without page reload
- Forms auto-populate with previously viewed data
- Global state management used for tenant context
- No tenant confirmation dialogs for destructive actions

**Prevention:**
1. **Force page reload on tenant context switch** - clears all client state
2. Include tenantId in every admin mutation payload (not just from URL)
3. Server validates tenantId matches the entity being modified
4. Show prominent tenant indicator with distinct colors per tenant
5. Require confirmation modal showing tenant name for destructive operations
6. Invalidate all cached queries on tenant switch
7. Never rely solely on URL parameters for tenant scoping

**Which phase should address:** Phase 2 (Core Admin UI) - tenant selector and context handling.

**Radl-specific concern:** Existing helpers like `get_current_club_id()` read from JWT claims. Super-admin needs a different pattern since they operate across all tenants - JWT claims don't apply.

---

### Pitfall 3: Privilege Escalation via Admin-Created Users

**What goes wrong:** Super-admin creates a user and assigns roles, but the role assignment bypasses normal RBAC validation. Admin accidentally (or maliciously) creates users with excessive privileges.

**Why it happens:**
- Admin user creation uses service_role which bypasses RLS
- Role assignment validation lives in application code, not database constraints
- "Create as super-admin" mental model skips the checks "normal" creation has
- Test/dev users created with elevated roles leak to production

**Consequences:**
- Regular users gain admin access
- Created users can create other admins (privilege explosion)
- Compliance violation (principle of least privilege)
- Orphaned super-privileged accounts

**Warning signs:**
- Admin can assign any role without role-specific validation
- No approval workflow for FACILITY_ADMIN or CLUB_ADMIN creation
- User creation succeeds without facility/club context
- Role dropdown shows all roles regardless of admin's own permissions

**Prevention:**
1. **Super-admin role hierarchy enforcement** - even super-admins have limits
2. Separate "create user" from "assign tenant roles" flows
3. Database-level check constraints on role assignments
4. Require dual-admin approval for FACILITY_ADMIN creation
5. Audit log specifically flags role elevation events
6. Implement role assignment cooldown/rate limiting
7. Daily report of all elevated role assignments

**Which phase should address:** Phase 3 (User Management) - user creation and role assignment flows.

**Radl-specific concern:** Current Role enum has 5 levels. Super-admin is not in this enum - it needs a separate `is_super_admin` flag or separate table, not just another role level.

---

### Pitfall 4: Service Role Key Exposure in Client Code

**What goes wrong:** Developer adds admin functionality and accidentally exposes service_role key to the browser, giving any authenticated user full database access.

**Why it happens:**
- Admin panel initially built with Server Components (safe)
- Feature requires client interactivity, converted to Client Component
- Environment variable `SUPABASE_SERVICE_ROLE_KEY` used where `NEXT_PUBLIC_` prefix shouldn't exist
- Code review misses the distinction

**Consequences:**
- Complete database compromise
- Any user can read/write all tenant data
- Attacker can delete all data
- Catastrophic breach requiring disclosure

**Warning signs:**
- `createClient(url, key)` called in files with `"use client"`
- `SUPABASE_SERVICE_ROLE_KEY` in client-side environment
- Admin features work in browser without API routes
- Network tab shows Authorization header with service role key

**Prevention:**
1. **Never name service role key without `SERVER_` or similar prefix**
2. ESLint rule to flag `createClient` in `"use client"` files
3. All admin mutations go through API routes, never direct from client
4. CI check: grep for service role key patterns in client bundles
5. Use separate Supabase project for admin operations (isolation)
6. Regular secret scanning in CI/CD

**Which phase should address:** Phase 1 (Foundation) - establish admin API route patterns before any features.

**Detection script (add to CI):**
```bash
# Fail if service role key could be in client bundle
grep -r "supabase.*createClient" --include="*.tsx" | \
  grep -v "// server" | \
  grep "'use client'" && exit 1
```

---

### Pitfall 5: Impersonation Without Safeguards

**What goes wrong:** Super-admin "impersonates" a user to debug their issue, but the impersonation session has no time limit, no visibility indicator, and actions taken appear as if the real user did them.

**Why it happens:**
- Impersonation implemented as "log in as user" with their credentials/session
- No separate "impersonated by" field in actions
- Impersonation session persists until manual logout
- Developer prioritizes functionality over safety controls

**Consequences:**
- Admin forgets they're impersonating, makes changes as wrong user
- Audit log shows user did action they didn't do (legal liability)
- Impersonation session hijacked if admin machine compromised
- User sees admin's actions in their activity history (confusion)

**Warning signs:**
- Impersonation works by setting cookies/localStorage to match target user
- No visual banner showing "You are viewing as [user]"
- Impersonated actions have same audit signature as real user
- No automatic session expiry for impersonation

**Prevention:**
1. **Impersonation creates a NEW session type** - not real user's session
2. Prominent banner: "Viewing as [User] - [Time Remaining] - [Exit Button]"
3. Maximum 30-minute impersonation sessions with forced re-auth
4. All impersonated actions logged with BOTH admin and user IDs
5. User gets notification: "Admin viewed your account at [time]"
6. Read-only impersonation by default, write requires explicit toggle
7. Impersonation audit log separate and immutable

**Which phase should address:** Phase 4 (Support Tools) - if impersonation is needed.

**Radl-specific consideration:** Consider if impersonation is actually needed. Alternative: "View as" read-only mode that shows what user sees without ability to act.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or poor admin experience.

### Pitfall 6: N+1 Queries in Multi-Tenant Dashboards

**What goes wrong:** Admin dashboard shows all tenants/users/data. Each row triggers individual database queries. With 100+ tenants, page takes 30+ seconds to load.

**Why it happens:**
- Query patterns designed for single-tenant context (existing RLS)
- Admin panel reuses existing components that assume tenant filtering
- Prisma relations eager-loaded without limits
- No pagination on admin list views

**Prevention:**
1. Admin queries specifically designed for cross-tenant efficiency
2. Pagination mandatory for all admin list views (max 50 items)
3. Aggregate queries for dashboard metrics (COUNT, SUM at DB level)
4. Background jobs for heavy reports, not real-time
5. Database indexes for admin query patterns (created_at, status)

**Which phase should address:** Phase 2 (Core Admin UI) - dashboard and list views.

---

### Pitfall 7: RLS Helper Functions Not Extended for Super-Admin

**What goes wrong:** Existing RLS helpers like `get_current_facility_id()` return NULL for super-admin (no facility context in JWT). Queries return no data or fail.

**Why it happens:**
- Current RLS designed around JWT claims with tenant context
- Super-admin has no "current tenant" in their JWT
- Helpers don't have "bypass for super-admin" logic
- Developer doesn't understand the JWT-based RLS pattern

**Prevention:**
1. Add `is_super_admin()` helper function checking JWT claim
2. Update RLS policies: `OR public.is_super_admin()`
3. Super-admin JWT includes `is_super_admin: true` claim
4. Test RLS policies explicitly with super-admin role
5. Document which tables need super-admin visibility

**Which phase should address:** Phase 1 (Foundation) - RLS policy updates.

**Radl-specific pattern (extend existing helpers):**
```sql
-- Add to JWT claims in access token hook
IF is_super_admin THEN
  claims := claims || jsonb_build_object('is_super_admin', true);
END IF;

-- Add helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean,
    false
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update existing policies
CREATE POLICY "super_admin_full_access" ON "Facility"
FOR ALL TO authenticated
USING (public.is_super_admin());
```

---

### Pitfall 8: Admin Actions Without Confirmation Flows

**What goes wrong:** Admin clicks "Delete Facility" and it immediately executes. 100 clubs, 1000 users, all their data - gone. No undo, no confirmation.

**Why it happens:**
- Copying patterns from regular user features (single-item delete)
- "Super-admin knows what they're doing" assumption
- No soft-delete for cascading entities
- Missing "are you sure?" for destructive actions

**Prevention:**
1. Destructive actions require typed confirmation ("type FACILITY NAME to delete")
2. Cascade preview: "This will delete: 15 clubs, 230 users, 5000 records"
3. Soft-delete with 30-day recovery window for major entities
4. Rate limit destructive actions (max 1 facility delete per hour)
5. Require second admin approval for tenant-level deletions

**Which phase should address:** Phase 3 (User Management) and Phase 5 (Tenant Management).

---

### Pitfall 9: Missing Rate Limiting on Admin Endpoints

**What goes wrong:** Compromised admin account makes 10,000 API calls in a minute, exfiltrating entire database or mass-modifying records before detection.

**Why it happens:**
- Admin endpoints trusted (authenticated = authorized)
- Rate limiting seen as "regular user" concern
- No anomaly detection for admin actions
- Focus on functionality over abuse prevention

**Prevention:**
1. Per-admin rate limits on all endpoints
2. Anomaly detection: alert on 10x normal admin activity
3. Admin session requires re-auth for bulk operations
4. Geographic/IP restrictions for admin access
5. Slow down sensitive reads (user PII export: 1 per minute)

**Which phase should address:** Phase 1 (Foundation) - rate limiting middleware.

---

### Pitfall 10: Inconsistent Data Visibility Rules

**What goes wrong:** Admin can see User records but not their AthleteProfile. Or can see Equipment but not DamageReports. Fragmented visibility makes debugging impossible.

**Why it happens:**
- Tables have different RLS policies, not unified for admin
- Some tables added later without admin visibility
- Relations crossed via joins but target table blocks access
- Developer updates one policy but not related tables

**Prevention:**
1. Admin visibility audit: matrix of all tables x admin access
2. Single "super_admin_read_all" policy pattern applied consistently
3. Integration tests for admin visibility on all entity types
4. Document admin access matrix in schema comments

**Which phase should address:** Phase 1 (Foundation) - RLS policy audit and updates.

---

## Minor Pitfalls

Mistakes that cause annoyance but are recoverable.

### Pitfall 11: Admin UI Not Responsive

**What goes wrong:** Admin panel designed for desktop only. Admin needs to check something on mobile, UI is unusable.

**Prevention:** Use existing Radl component library, test at mobile breakpoints.

**Which phase should address:** Phase 2 (Core Admin UI).

---

### Pitfall 12: No Admin Search/Filter Persistence

**What goes wrong:** Admin applies filters to find a user, clicks to view details, goes back - filters reset. Must re-apply filters repeatedly.

**Prevention:** URL-based state for filters, or localStorage persistence.

**Which phase should address:** Phase 2 (Core Admin UI).

---

### Pitfall 13: Timezone Confusion in Admin Views

**What goes wrong:** Admin sees "Created at: 2pm" but user is in different timezone and sees "Created at: 8pm". Leads to confusion in support tickets.

**Prevention:** Always show UTC in admin views, or show both user's local + UTC.

**Which phase should address:** Phase 2 (Core Admin UI).

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Foundation | Service role key exposure, missing audit infrastructure | Establish API route patterns, audit middleware first |
| Phase 2: Core Admin UI | Tenant context leakage, N+1 queries | Force context reset on tenant switch, pagination |
| Phase 3: User Management | Privilege escalation via user creation | Role hierarchy enforcement, approval workflows |
| Phase 4: Support Tools | Impersonation without safeguards | Separate session type, time limits, dual logging |
| Phase 5: Tenant Management | Destructive actions without confirmation | Typed confirmation, soft-delete, cascade preview |
| Phase 6: Analytics | Performance issues with cross-tenant aggregation | Background jobs, materialized views |

---

## Security Checklist for Admin Panel

Before launch, verify:

- [ ] Service role key never appears in client bundle (CI check)
- [ ] All admin actions logged to SuperAdminAuditLog
- [ ] Super-admin JWT has `is_super_admin` claim
- [ ] RLS policies include `OR is_super_admin()` where needed
- [ ] Tenant context indicator visible in all admin views
- [ ] Destructive actions require typed confirmation
- [ ] Impersonation (if implemented) has time limits and dual logging
- [ ] Rate limiting on all admin endpoints
- [ ] Admin access requires MFA
- [ ] Admin session timeout shorter than regular users (15 min idle)

---

## Sources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Service Role Security](https://supabase.com/docs/guides/api/api-keys)
- [Multi-Tenant RLS Failures - InstaTunnel](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Cross-Tenant Data Leaks - Dana Epp](https://danaepp.com/cross-tenant-data-leaks-ctdl-why-api-hackers-should-be-on-the-lookout)
- [Building Secure Impersonation - Medium](https://medium.com/@codebyzarana/building-a-secure-user-impersonation-feature-for-multi-tenant-enterprise-applications-21e79476240c)
- [Cross-Tenant Impersonation Prevention - Okta](https://sec.okta.com/articles/2023/08/cross-tenant-impersonation-prevention-and-detection/)
- [Audit Logs for SaaS Enterprise - Frontegg](https://frontegg.com/blog/audit-logs-for-saas-enterprise-customers)
- [EnterpriseReady Audit Log Guide](https://www.enterpriseready.io/features/audit-log/)
- [Access Control Vulnerabilities - PortSwigger](https://portswigger.net/web-security/access-control)
- [Privilege Escalation - BeyondTrust](https://www.beyondtrust.com/blog/entry/privilege-escalation-attack-defense-explained)
- Radl existing codebase: `/home/hb/radl/src/lib/auth/authorize.ts`, `/home/hb/radl/supabase/migrations/00005_facility_rls_helpers.sql`
