# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.2 Security Audit - Phase 25 in progress

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.2 Security Audit |
| Phase | Phase 25 - API Authentication & JWT Security |
| Plan | 01 complete, continuing |
| Status | In progress |
| Last activity | 2026-01-28 - Completed 25-01-PLAN.md (API Authentication Audit) |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
v2.2: [#         ]  11% IN PROGRESS (Phases 25-27) — 4/35 requirements audited
```

## Shipped Milestones

### v2.1 UX Refinement (2026-01-27)

**Delivered:** 30 requirements across 7 phases (18-24)

**Features:**
- Navigation/Layout redesign — desktop sidebar + mobile bottom nav
- Announcements — coach broadcasts with priority levels
- Public issue reporting — QR-based damage reports (no login required)
- Equipment readiness — calculated status with maintenance workflow
- Practice flow — inline editing, block structure, drag-drop lineups
- Dashboard enhancements — role-specific widgets, usage trends
- Regatta Central integration — calendar display with caching

**Audit:** Passed (30/30 requirements, 7/7 phases, 6/6 integrations, 5/5 flows)

### v2.0 Commercial Readiness (2026-01-26)

**Delivered:** 34 requirements across 8 phases (10-17)

**Features:**
- Facility model — shared equipment between clubs
- Mobile PWA — responsive, touch-friendly, offline-first
- UI/UX Polish — shadcn/ui, command palette, keyboard shortcuts
- Security — RBAC, MFA, SSO, API keys

### v1.1 Polish (2026-01-22)

**Delivered:**
- RC Settings UI (status display, OAuth connect/disconnect, manual import, auto-sync toggle)
- Equipment usage display (history on detail page, summary on list page)
- Data export (equipment, roster, schedule to CSV)

**Deferred:**
- NOTIF-01: Push notification for equipment damage
- NOTIF-02: Push notification for lineup published

### v1.0 MVP (2026-01-22)

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:** 5 phases, 37 plans, 31 requirements, 79,737 LOC, 3 days

## v2.2 Security Audit (Current Milestone)

**Goal:** Validate security architecture before beta testing through comprehensive audit of authentication, authorization, tenant isolation, secrets management, logging, and rate limiting.

**Phases:** 25-27
**Requirements:** 35 total
- API Authentication: 7 requirements (AUTH-01 through AUTH-07)
- RBAC Permissions: 7 requirements (RBAC-01 through RBAC-07)
- Tenant Isolation: 6 requirements (ISOL-01 through ISOL-06)
- Secrets & Environment: 5 requirements (SECR-01 through SECR-05)
- Audit Logging: 5 requirements (AUDIT-01 through AUDIT-05)
- Rate Limiting: 5 requirements (RATE-01 through RATE-05)

**Current Phase:** Phase 25 - API Authentication & JWT Security
- Verifies JWT signature, expiration, claims validation
- Tests session persistence and logout behavior
- Validates token refresh without re-authentication
- Ensures no unprotected API endpoints

**Next Phase:** Phase 26 - RBAC & Tenant Isolation
- Tests role boundary enforcement (5-role hierarchy)
- Validates RLS policies at database level
- Verifies cross-tenant data access is blocked
- Tests JWT claims match data access patterns

**Final Phase:** Phase 27 - Secrets, Logging & Rate Limiting
- Audits secrets in client bundle and environment variables
- Validates immutable audit logging for security events
- Tests rate limiting on authentication endpoints

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

### Architecture Notes

- **Multi-tenant:** Facility → club → team hierarchy with JWT claims, RLS policies for database-level isolation
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase + React 19
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Toast notifications:** Sonner (dark theme, bottom-right, rich colors)
- **Data export:** CSV with proper escaping, immediate download
- **RBAC:** @casl/ability + @casl/prisma + @casl/react for isomorphic permissions
- **Design system:** shadcn/ui with Tailwind v4, zinc color scheme
- **Mobile:** @use-gesture/react, vaul for touch interactions
- **Drag-drop:** @dnd-kit for lineups

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for v3.0 |
| Dynamic team colors | DEFERRED | Color settings stored in DB, UI uses fixed emerald colors |

### Security Audit Context (v2.2)

**Critical vulnerabilities to check:**
- React2Shell RCE (CVE-2025-55182) - Next.js upgrade to 16.0.12+
- Middleware bypass (CVE-2025-29927) - x-middleware-subrequest header
- RLS misconfiguration (83% of Supabase breaches)
- Prisma RLS bypass (superuser role by default)
- Server Action validation missing (Zod schemas required)

**Tools for audit:**
- Semgrep (SAST)
- TruffleHog (secrets scanning)
- SupaShield + pgTAP (RLS testing)
- OWASP ZAP (DAST)
- jwt_tool (JWT security testing)

**Research flags:**
- Phase 26 likely needs deeper research for facility-shared equipment RLS policies
- Standard patterns for Phase 25 and Phase 27 (no additional research needed)

## Phase 25 Audit Findings

| Requirement | Status | Notes |
|-------------|--------|-------|
| AUTH-01: API Authentication | PASS | 88 routes audited, all protected or justified |
| AUTH-05: Session Persistence | PASS | httpOnly cookies + middleware refresh |
| AUTH-06: Logout Implementation | FAIL | No logout functionality exists (CRITICAL) |
| AUTH-07: Token Refresh | PASS | Automatic via getUser() |

**Critical Issue:** AUTH-06 - Users cannot log out. Requires remediation.

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-28T23:15:00Z |
| Stopped at | Completed 25-01-PLAN.md (API Authentication Audit) |
| Resume file | None |

---

*Last updated: 2026-01-28 (Phase 25-01 complete)*
