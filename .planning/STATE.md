# Radl Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.3 Core Flow Testing - Phase 31 UX Quality Polish

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.3 Core Flow Testing |
| Phase | 31 - UX Quality Polish |
| Plan | 03 complete (Settings Cleanup) |
| Status | In progress |
| Last activity | 2026-01-29 - Completed 31-03-PLAN.md |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
v2.2: [##########] 100% SHIPPED (2026-01-29) — 33/35 requirements
v2.3: [########░░] 80% — Phases 28-30 complete, Phase 31 in progress
```

## Shipped Milestones

### v2.2 Security Audit (2026-01-29)

**Delivered:** 35 requirements across 3 phases (25-27)

**Features:**
- API authentication — 88 routes audited, JWT verification, session management
- RBAC & tenant isolation — 163 tests (109 CASL, 17 API, 17 role propagation, 20 pgTAP)
- Secrets management — bundle scanner, CI/CD integration, SHA-256 API key hashing
- Audit logging — immutable logs, 8 auth event types, PERMISSION_DENIED tracking
- Rate limiting — auth endpoints (5/15min login, 3/hr signup/reset), Upstash Redis integration

**Audit:** Passed (31 PASS, 2 CONDITIONAL PASS, 2 DEFERRED, 0 FAIL)

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

### v1.0 MVP (2026-01-22)

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:** 5 phases, 37 plans, 31 requirements, 79,737 LOC, 3 days

## v2.3 Core Flow Testing

**Goal:** Verify all major user journeys work end-to-end and fix issues discovered before beta release.

**Status:** Roadmap created, ready for Phase 28 planning

**Phases:**
| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 28 | Onboarding Flow Testing | ONBD-01 to ONBD-06 (6) | Complete |
| 29 | Practice Flow Testing | PRAC-01 to PRAC-05 (5) | Complete |
| 30 | Equipment Flow Testing | EQUP-01 to EQUP-04 (4) | Complete |
| 31 | UX Quality Polish | UXQL-01 to UXQL-05 (5) | In progress (2/3 plans) |

**Total:** 20 requirements across 4 phases

## Phase 28: Onboarding Flow Testing

**Goal:** New users can successfully sign up, create a team, invite members, and those members can join

**Requirements:**
- ONBD-01: User can sign up with email and password ✓
- ONBD-02: User receives and can complete email verification ✓
- ONBD-03: User can create a new team/club after signup ✓
- ONBD-04: Coach/admin can invite members via email ✓
- ONBD-05: Invited user can accept invitation and join team ✓
- ONBD-06: New users see helpful empty states guiding next actions ✓

**Status:** Complete - All 6 requirements verified

## Phase 29: Practice Flow Testing

**Goal:** Coaches can plan practices with lineups and athletes know where to be and what boat they're in

**Requirements:**
- PRAC-01: Coach can create practice with date, time, name and see it on calendar ✓
- PRAC-02: Coach can add water, erg, land, and meeting blocks to practice ✓
- PRAC-03: Coach can drag athletes into lineup seats and assignments persist after save ✓
- PRAC-04: Athletes see their boat assignment when practice is published ✓
- PRAC-05: Calendar shows practices with green dots and draft/published styling ✓

**Status:** Complete - All 5 requirements verified

## Phase 30: Equipment Flow Testing

**Goal:** Equipment can be managed through its full lifecycle from creation to damage resolution

**Requirements:**
- EQUP-01: Admin/coach can add equipment with full details ✓
- EQUP-02: Equipment usage is tracked when assigned to lineups ✓
- EQUP-03: Anyone can report damage via QR code without login ✓
- EQUP-04: Coach can view damage reports and mark resolved ✓

**Status:** Complete - All 4 requirements verified

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

| Decision | Date | Outcome |
|----------|------|---------|
| Dual auth patterns coexist | 2026-01-29 | Both secure; migration is code quality, not security |
| 404 for cross-tenant access | 2026-01-29 | Prevents resource enumeration attacks |
| Booking clubName acceptable | 2026-01-29 | Public coordination data at shared facilities |
| Database lookup per request | 2026-01-29 | Security over performance; 2 DB queries for immediate role propagation |
| Fire-and-forget audit logging | 2026-01-29 | Performance over guaranteed logging in error responses |
| Defense-in-depth immutability | 2026-01-29 | RLS + trigger to protect AuditLog from service role modifications |
| Server-side auth mandatory | 2026-01-29 | All auth flows through API routes for rate limiting and logging |
| Per-action rate limiters | 2026-01-29 | Different auth actions need different limits (login vs signup) |
| Email enumeration prevention | 2026-01-29 | Password reset always returns success to prevent email discovery |
| Location field workaround | 2026-01-29 | Use notes field for practice location (acceptable for MVP) |
| Meeting blocks minimal content | 2026-01-29 | Notes-only sufficient for meeting blocks (by design) |

### Architecture Notes

- **Multi-tenant:** Facility -> club -> team hierarchy with JWT claims, RLS policies for database-level isolation
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
| Equipment RLS | RESOLVED | 00004_equipment_rls.sql enables RLS with 4 policies |

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-29 |
| Stopped at | Completed 31-03-PLAN.md |
| Resume with | `/gsd:execute-phase 31-02-PLAN.md` |

---

*Last updated: 2026-01-29 (Phase 31 plan 03 complete)*
