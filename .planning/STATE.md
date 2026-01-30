# Radl Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v3.0 Production Polish — Phase 34: UX Polish

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v3.0 Production Polish |
| Phase | 34 - UX Polish |
| Plan | 02 of 04 complete (34-02) |
| Status | In progress |
| Last activity | 2026-01-30 — Completed 34-02-PLAN.md (Detail Page Loading States) |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
v2.2: [##########] 100% SHIPPED (2026-01-29) — 33/35 requirements
v2.3: [##########] 100% SHIPPED (2026-01-29) — 20/20 requirements
v3.0: [######    ] 69% — 20/29 requirements (Phases 32-35)
```

**Total shipped:** 6 milestones, 31 phases, 160 requirements

## v3.0 Milestone Overview

**Goal:** Production-ready polish before user launch

**Phases:**
| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 32 | Safe Areas & Branding | 8 | COMPLETE |
| 33 | Legal Pages | 4 | COMPLETE |
| 34 | UX Polish | 11 | In Progress (4/11) |
| 35 | Device-Specific | 6 | Pending |

**Parallelization:** Phase 33 (Legal) can run in parallel with Phase 32

## Shipped Milestones

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
| Dual auth patterns coexist | 2026-01-29 | Both secure; migration is code quality, not security |
| 404 for cross-tenant access | 2026-01-29 | Prevents resource enumeration attacks |
| Database lookup per request | 2026-01-29 | Security over performance; immediate role propagation |
| Defense-in-depth immutability | 2026-01-29 | RLS + trigger to protect AuditLog |
| Server-side auth mandatory | 2026-01-29 | All auth flows through API routes for rate limiting |
| Per-action rate limiters | 2026-01-29 | Different auth actions need different limits |
| Location field workaround | 2026-01-29 | Use notes field for practice location (acceptable for MVP) |
| Meeting blocks minimal content | 2026-01-29 | Notes-only sufficient for meeting blocks (by design) |
| onTouched validation mode | 2026-01-29 | Immediate feedback on field blur, better UX |
| Safe area on wrapper not component | 2026-01-30 | pb-[env(safe-area-inset-bottom)] on nav wrapper keeps component reusable |
| Sticky footer flex pattern | 2026-01-30 | min-h-screen + flex flex-col + flex-1 main for proper footer placement |
| SVG spinner pattern | 2026-01-30 | Consistent spinner SVG across all components (notification-settings style) |
| Variant pattern for styling | 2026-01-30 | variantStyles object for component style variations |
| Detail skeleton bg colors | 2026-01-30 | Roster uses white bg cards; equipment/practice use zinc-900 |

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
| Strokeline -> Radl rename | RESOLVED | Phase 32-04 - Verified no Strokeline in UI |
| Color palette update | RESOLVED | Phase 32-02 - migrated 278 emerald->teal |
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for v4.0 |
| Dynamic team colors | RESOLVED | Using brand teal, not dynamic per-team |
| CASL migration | IDENTIFIED | 59 routes use legacy getClaimsForApiRoute pattern |
| Vitest framework | ADDED | 26-02 - Unit test infrastructure |
| pgTAP RLS tests | CREATED | 26-04 - 20 tests awaiting multi-tenant data |
| Equipment RLS | RESOLVED | 00004_equipment_rls.sql enables RLS with 4 policies |

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-30 |
| Stopped at | Completed 34-02-PLAN.md (Detail Page Loading States) |
| Resume with | 34-03 (Empty States) |

---

*Last updated: 2026-01-30 (Plan 34-02 complete)*
