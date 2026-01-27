# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Between milestones — v2.1 shipped, ready for next milestone

## Current Position

| Field | Value |
|-------|-------|
| Milestone | Between milestones |
| Phase | N/A |
| Plan | N/A |
| Status | Ready for next milestone |
| Last activity | 2026-01-27 — v2.1 shipped |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
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

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
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
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for future milestone |
| Dynamic team colors | DEFERRED | Color settings stored in DB, UI uses fixed emerald colors |

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-27 19:30 UTC |
| Stopped at | v2.1 archived, ready for next milestone |
| Resume file | None |

---

*Last updated: 2026-01-27 (v2.1 shipped and archived)*
