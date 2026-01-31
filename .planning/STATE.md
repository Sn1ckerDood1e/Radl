# Radl Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v3.1 Admin Panel - Platform owner management

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v3.1 Admin Panel |
| Phase | 38 - Facility & Club Management |
| Plan | 01 of 5 complete |
| Status | In progress |
| Last activity | 2026-01-31 - Completed 38-01-PLAN.md |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) - 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) - 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) - 30/30 requirements
v2.2: [##########] 100% SHIPPED (2026-01-29) - 33/35 requirements
v2.3: [##########] 100% SHIPPED (2026-01-29) - 20/20 requirements
v3.0: [##########] 100% SHIPPED (2026-01-30) - 29/29 requirements
v3.1: [######----] 62% IN PROGRESS - 21/34 requirements
```

**Total shipped:** 7 milestones, 35 phases, 196 requirements

## v3.1 Milestone Overview

**Goal:** Platform owner can manage all users, clubs, and memberships through a super-admin panel

**Phases:**
| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 36 | Admin Foundation & Auth | 7 | Complete |
| 37 | User Management | 9 | Complete |
| 38 | Facility & Club Management | 11 | In progress (5/11) |
| 39 | Membership Management | 5 | Pending |
| 40 | Audit Log Viewer & Export | 2 | Pending |

**Architecture decisions (from research):**
- Separate `(admin)` route group from `(dashboard)`
- Database-verified super admin (not JWT claims only)
- Use Prisma directly (bypasses RLS) + getSupabaseAdmin() for auth ops
- No AbilityProvider in admin routes (admin bypasses CASL for tenants)
- Audit logging for all admin mutations

## Shipped Milestones

### v3.0 Production Polish (2026-01-30)

**Delivered:** 29 requirements across 4 phases (32-35)

### v2.3 Core Flow Testing (2026-01-29)

**Delivered:** 20 requirements across 4 phases (28-31)

### v2.2 Security Audit (2026-01-29)

**Delivered:** 33 requirements across 3 phases (25-27)

### v2.1 UX Refinement (2026-01-27)

**Delivered:** 30 requirements across 7 phases (18-24)

### v2.0 Commercial Readiness (2026-01-26)

**Delivered:** 34 requirements across 8 phases (10-17)

### v1.1 Polish (2026-01-22)

**Delivered:** 9 requirements across 4 phases (6-9)

### v1.0 MVP (2026-01-22)

**Delivered:** 31 requirements across 5 phases (1-5), 79,737 LOC

## Accumulated Context

### Key Decisions

| Decision | Date | Outcome |
|----------|------|---------|
| Database-verified super admin | 2026-01-30 | Check SuperAdmin table on every request, not JWT claims |
| SuperAdmin RLS blocks all writes | 2026-01-31 | Super admins created via seed script only, not API |
| is_super_admin JWT claim | 2026-01-31 | Fast middleware check; database remains source of truth |
| Silent redirect for non-admins | 2026-01-31 | Redirect to / without error to avoid admin panel disclosure |
| CASL super admin early return | 2026-01-31 | can('manage', 'all') bypasses all role checks for performance |
| 'PLATFORM' clubId for admin audit | 2026-01-31 | Platform-level audit logs distinguished from club-scoped logs |
| Separate (admin) route group | 2026-01-30 | Isolate admin UI from tenant dashboard |
| Prisma direct for admin | 2026-01-30 | Admin bypasses RLS; Prisma sufficient |
| 30-min session timeout | 2026-01-30 | Security requirement for admin panel |
| Dual auth patterns coexist | 2026-01-29 | Both secure; migration is code quality, not security |
| 404 for cross-tenant access | 2026-01-29 | Prevents resource enumeration attacks |
| Database lookup per request | 2026-01-29 | Security over performance; immediate role propagation |
| Defense-in-depth immutability | 2026-01-29 | RLS + trigger to protect AuditLog |
| Server-side auth mandatory | 2026-01-29 | All auth flows through API routes for rate limiting |
| Per-action rate limiters | 2026-01-29 | Different auth actions need different limits |
| onTouched validation mode | 2026-01-29 | Immediate feedback on field blur, better UX |
| Safe area on wrapper not component | 2026-01-30 | pb-[env(safe-area-inset-bottom)] on nav wrapper keeps component reusable |
| Prisma cached in production | 2026-01-30 | Prevents connection pool exhaustion on Vercel |
| Supabase pooler port 6543 | 2026-01-30 | Required for serverless environments |
| Server actions for MFA | 2026-01-31 | 'use server' directive for Supabase MFA API operations |
| Three-stage MFA enrollment | 2026-01-31 | Initial/scan/done stages for clear UX progression |
| MFA required for admin access | 2026-01-31 | Redirect to /mfa-setup or /mfa-verify before /admin |
| User menu in dashboard header | 2026-01-31 | Added for sign out and Admin Panel link |
| Client-side admin timeout | 2026-01-31 | Admin-only 30-min timeout to not affect regular users |
| Throttled activity detection | 2026-01-31 | 1-second minimum between timer resets for performance |
| Client-side search filtering | 2026-01-31 | Supabase Admin API lacks server-side search; filter after fetch |
| 100-year ban for deactivation | 2026-01-31 | 876000h provides permanent-ish ban while remaining reversible |
| Block password reset for banned | 2026-01-31 | Security measure - must reactivate before password reset |
| URL-based pagination/search | 2026-01-31 | Enables bookmarkable search results and browser nav |
| Server component fetch pattern | 2026-01-31 | Forward cookies via header for internal API auth |
| Shared UserForm component | 2026-01-31 | Single form handles create/edit modes for DRY code |
| Email immutability in edit | 2026-01-31 | Supabase auth constraint; email disabled in edit mode |
| CSV column name flexibility | 2026-01-31 | Support name, displayName, full_name for better CSV import compat |
| 100-user batch limit | 2026-01-31 | Prevents timeout/memory issues in bulk operations |
| Cascade delete preview | 2026-01-31 | DELETE without confirm returns impact; with confirm performs delete |

### Architecture Notes

- **Multi-tenant:** Facility -> club -> team hierarchy with JWT claims, RLS policies
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase + React 19
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **RBAC:** @casl/ability + @casl/prisma + @casl/react for isomorphic permissions
- **Design system:** shadcn/ui with Tailwind v4, zinc color scheme
- **Mobile:** @use-gesture/react, vaul for touch interactions
- **Drag-drop:** @dnd-kit for lineups
- **Form validation:** react-hook-form with mode: 'onTouched', reValidateMode: 'onChange'

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RLS security hardening | PENDING | 7 migrations ready (00010-00017) |
| Middleware Prisma removal | RESOLVED | 2026-01-30 - API key validation moved to routes |
| CASL migration | IDENTIFIED | 59 routes use legacy getClaimsForApiRoute pattern |

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-31 |
| Stopped at | Completed 38-01-PLAN.md (Facility Management API) |
| Resume with | `/gsd:execute-phase 38-02` |

---

*Last updated: 2026-01-31 (Phase 38-01 complete)*
