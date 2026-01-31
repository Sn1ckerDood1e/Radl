# Phase 36: Admin Foundation & Authentication - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Super admin can securely access a protected admin panel with database-verified permissions. Includes SuperAdmin table, CASL integration, MFA enforcement, audit logging infrastructure, and the `(admin)` route group with protected layout.

User management, facility/club CRUD, and membership management are separate phases (37-39).

</domain>

<decisions>
## Implementation Decisions

### Admin panel entry point
- Regular login at /login, then navigate to /admin if super admin
- "Admin Panel" link appears in user menu dropdown (only for super admins)
- Non-admins attempting /admin are silently redirected to their dashboard
- Super admins can use both admin panel AND regular app (switch between /admin and club dashboard)

### Super admin designation
- First super admin created via database seed/migration script
- Additional super admins added via direct database INSERT only (not through admin panel)
- Super admin status can be revoked via direct database DELETE only
- This is intentional security: no UI for granting platform-level access

### MFA enforcement flow
- MFA required at login only (session is trusted after that)
- Super admin without MFA configured is blocked from /admin until they set up MFA
- Use Supabase's built-in MFA (TOTP + backup codes)
- MFA feature is super admin only for now (not available to regular users)

### Admin dashboard layout
- Sidebar navigation matching regular dashboard pattern (Users, Facilities, Clubs, Audit Log)
- Landing page (/admin) shows platform stats overview: total users, facilities, clubs, recent activity
- "Return to app" navigation handled by Claude's discretion

### Claude's Discretion
- Visual styling differences between admin panel and regular app (same look vs subtle accent changes)
- "Back to app" UX pattern (sidebar link vs user menu toggle)
- Super admin count limits/warnings
- Exact audit log entry format

</decisions>

<specifics>
## Specific Ideas

- Admin panel navigation should feel familiar — same sidebar pattern as regular dashboard
- Security-first approach: no UI for granting super admin status, database-only is intentional
- MFA setup blocking is non-negotiable — super admins must have MFA before accessing sensitive admin functions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-admin-foundation-auth*
*Context gathered: 2026-01-30*
