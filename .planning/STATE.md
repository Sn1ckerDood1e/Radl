# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.2 Security Audit - Phase 26 complete, Phase 27 next (Secrets, Logging & Rate Limiting)

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.2 Security Audit |
| Phase | Phase 26 - RBAC & Tenant Isolation |
| Plan | 09 complete (Final Verification) |
| Status | Phase complete |
| Last activity | 2026-01-29 - Completed 26-09-PLAN.md (Final Verification) |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
v2.2: [#######   ]  67% IN PROGRESS (Phases 25-27) — 20/35 requirements assessed
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

**Completed Phase:** Phase 25 - API Authentication & JWT Security
- All 7 AUTH requirements PASS
- 88 routes audited, all protected or justified

**Completed Phase:** Phase 26 - RBAC & Tenant Isolation
- All 9 plans complete
- 9 PASS, 2 CONDITIONAL PASS, 2 DEFERRED (RBAC-05 and ISOL-01)
- 163 tests created (109 CASL unit, 17 API RBAC, 17 role propagation, 20 pgTAP RLS)
- Critical gap: Equipment RLS disabled (requires migration fix)
- Verification document: 26-VERIFICATION.md

**Next Phase:** Phase 27 - Secrets, Logging & Rate Limiting
- Audits secrets in client bundle and environment variables
- Validates immutable audit logging for security events
- Tests rate limiting on authentication endpoints

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

| Decision | Date | Outcome |
|----------|------|---------|
| Dual auth patterns coexist | 2026-01-29 | Both secure; migration is code quality, not security |
| 404 for cross-tenant access | 2026-01-29 | Prevents resource enumeration attacks |
| Booking clubName acceptable | 2026-01-29 | Public coordination data at shared facilities |
| Database lookup per request | 2026-01-29 | Security over performance; 2 DB queries for immediate role propagation |

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
| CASL migration | IDENTIFIED | 59 routes use legacy getClaimsForApiRoute pattern |
| Vitest framework | ADDED | 26-02 - Unit test infrastructure for security audit |
| pgTAP RLS tests | CREATED | 26-04 - 20 tests awaiting multi-tenant data |
| Equipment RLS disabled | CRITICAL | 26-04 - 4 policies exist but RLS not enabled |

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
| AUTH-02: JWT Signature Verification | PASS | getUser() called before getSession() in all auth paths |
| AUTH-03: Expired Token Rejection | PASS | Supabase getUser() handles server-side validation |
| AUTH-04: Claims Validation | PASS | CustomJwtPayload interface defines expected structure |
| AUTH-05: Session Persistence | PASS | httpOnly cookies + middleware refresh |
| AUTH-06: Logout Implementation | PASS | POST /api/auth/logout + settings button (25-04) |
| AUTH-07: Token Refresh | PASS | Automatic via getUser() |

**Status:** All 7 AUTH requirements PASS. Phase 25 complete.

## Phase 26 Audit Findings (COMPLETE)

| Requirement | Status | Notes |
|-------------|--------|-------|
| RBAC-01: FACILITY_ADMIN | PASS | 109 unit tests verify role boundaries |
| RBAC-02: CLUB_ADMIN | PASS | Unit tests verify cross-club blocked |
| RBAC-03: COACH | PASS | 17 API tests + 109 unit tests |
| RBAC-04: ATHLETE | PASS | Unit tests verify read-only, API tests verify 403 |
| RBAC-05: PARENT | DEFERRED | ParentAthleteLink table does not exist |
| RBAC-06: Server-side CASL | CONDITIONAL PASS | 16/88 routes full CASL; all routes secure |
| RBAC-07: Role Propagation | PASS | Database lookup per request, not JWT-only |
| ISOL-01: RLS Enabled | CONDITIONAL PASS | 5/43 tables (12%); uses service role + app filtering |
| ISOL-02: Tenant Filtering | PASS | All 5 enabled tables have correct filtering |
| ISOL-03: Cross-Tenant Tests | CONDITIONAL PASS | 20 pgTAP tests; no multi-tenant data to verify |
| ISOL-04: JWT Claims | PASS | 8 helper functions, 13 policies verified |
| ISOL-05: Prisma Filtering | PASS | Covered by RBAC-06; accessibleBy pattern used |
| ISOL-06: API Response Leaks | PASS | 25+ endpoints audited, 404 pattern prevents enumeration |

**Summary:** 9 PASS, 2 CONDITIONAL PASS (RBAC-06, ISOL-01), 2 DEFERRED (RBAC-05, ISOL-03 needs data)

**Critical Gap:** Equipment table has 4 RLS policies but RLS is NOT ENABLED. Fix required before beta.

**Test Infrastructure:** 163 new tests (109 CASL unit, 17 API RBAC, 17 role propagation, 20 pgTAP RLS)

**Status:** Phase 26 COMPLETE. Proceed to Phase 27.

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-29T03:20:49Z |
| Stopped at | Completed 26-09-PLAN.md (Final Verification) |
| Resume file | None |

---

*Last updated: 2026-01-29 (Phase 26 complete)*
