# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v2.0 Commercial Readiness — facility model, mobile PWA, UI/UX polish, security hardening

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v2.0 Commercial Readiness |
| Phase | Phase 10: Security Foundation & RBAC |
| Plan | 09 of 11 complete |
| Status | In progress |
| Last activity | 2026-01-23 — Completed 10-09-PLAN.md |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [######    ] ~8% — Phase 10 Plan 09 complete
```

**Current Phase Detail:**
- Phase 10: Security Foundation & RBAC
- Plans: 9/11 complete
- Requirements: SEC-04, SEC-05, SEC-06, SEC-07, SEC-11
- Success criteria: 5 observable behaviors
- Dependencies: None (foundation phase)

**Session Continuity:**
- Last session: 2026-01-23
- Stopped at: Completed 10-09-PLAN.md
- Resume file: .planning/phases/10-security-foundation-rbac/10-10-PLAN.md

## v2.0 Scope

**Goal:** Prepare RowOps for commercial sale to rowing organizations

**Phases:** 10-17 (8 phases total)

**Target features:**
1. **Facility Model** — Facility-level tenancy with shared equipment between clubs
2. **Mobile PWA** — Responsive, touch-friendly, app-like, architect for native
3. **UI/UX Polish** — Modern design + intuitive workflows
4. **Security Hardening** — Roles audit, permissions, multi-tenant confidence

**Real-world scenario:** Chattanooga Rowing (boathouse) hosts Lookout Rowing Club and Chattanooga Juniors. Each club has subscription, some boats are shared.

**Phase structure:**
- Phase 10-11: Security foundation (RBAC, MFA, SSO)
- Phase 12-13: Facility model (schema, auth integration)
- Phase 14: Design system foundation
- Phase 15: Mobile PWA improvements (parallel with 13-14)
- Phase 16: UI/UX polish
- Phase 17: Facility UI features

**Critical path:** Phase 10 → 12 → 13 → 17
**Parallel opportunities:** Phase 15 (Mobile) can run with Phases 13-14

## Shipped Milestones

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

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

**v2.0 decisions:**
- Security foundation first (all features depend on stable hierarchical auth)
- Expand-migrate-contract for schema (backward compatibility for team-only installs)
- JWT claims extension (minimal change to existing auth)
- shadcn/ui over full framework (copy-paste ownership, no runtime dependency)
- Mobile parallel with auth (no dependency, can run simultaneously)
- Facility UI last (requires complete foundation)
- No-inheritance RBAC: FACILITY_ADMIN cannot create lineups without explicit COACH role

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)
- **Toast notifications:** Sonner (dark theme, bottom-right, rich colors)
- **Data export:** CSV with proper escaping, immediate download

**v2.0 additions (planned):**
- **Design system:** shadcn/ui with Tailwind v4 theme
- **RBAC:** @casl/ability + @casl/react for isomorphic permissions
- **Touch gestures:** @use-gesture/react for mobile interactions
- **RLS:** PostgreSQL Row Level Security via Supabase
- **Hierarchical tenancy:** Facility → Club → Team

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for future milestone |

**v2.0 mitigation:**
- Component migration tracking (Phase 14) to prevent drift
- RLS connection pooling tests (Phase 12) to prevent leaks
- Tenant-aware cache keys (Phase 15) to prevent cross-tenant data exposure

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

### Research Flags for v2.0

**Phases needing deeper research during planning:**
- **Phase 13:** Custom Access Token Hook with Supabase Edge Functions (memory/timeout constraints)
- **Phase 17:** Equipment reservation conflict detection (partial boat availability logic)

**Standard patterns (skip research-phase):**
- **Phase 10:** Prisma Client Extensions, CASL setup
- **Phase 14:** shadcn/ui installation
- **Phase 15:** PWA offline-first, touch gestures
- **Phase 16:** Standard UI/UX patterns

---

*Last updated: 2026-01-23 (Phase 10 Plan 09 complete)*
