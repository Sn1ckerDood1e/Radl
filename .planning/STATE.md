# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v1.1 Polish — RC settings UI, equipment usage display, notifications, data export

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.1 |
| Phase | 6 (RC Settings UI) — UI complete, testing deferred |
| Plan | 06-02 of 2 |
| Status | UI built, RC credentials needed for full test |
| Last activity | 2026-01-22 — Phase 6 UI complete |

**Progress:**
```
v1.0: [##########] 100% SHIPPED
v1.1: [██        ] 18% (4 phases, 11 requirements)
      Phase 6: RC Settings UI — UI complete (RC credentials needed)
      Phase 7: Equipment Usage Display — pending
      Phase 8: Notifications — pending
      Phase 9: Data Export — pending
```

## v1.0 Summary

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:**
- 5 phases, 37 plans
- 31 requirements implemented
- 79,737 LOC TypeScript
- 3 days (2026-01-20 → 2026-01-22)

**Archived:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

## v1.1 Scope

**Goal:** Polish v1.0 — complete UI gaps, surface collected data, add notifications and data portability.

**Phases:**
| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 6 | RC Settings UI | 4 | Pending |
| 7 | Equipment Usage Display | 2 | Pending |
| 8 | Notifications | 2 | Pending |
| 9 | Data Export | 3 | Pending |

## Next Steps

1. Continue executing Phase 6 plans (06-02 onwards)
2. Complete RC Settings UI implementation
3. Continue with phases 7-9

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

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| DEBT-01: Claims helper | COMPLETE | v1.0 |
| DEBT-02: Form refactoring | COMPLETE | v1.0 |
| DEBT-03: Query caching | COMPLETE | v1.0 |
| RC import UI | v1.1 ACTIVE | Phase 6: Settings page for connection management |
| Equipment usage display | v1.1 ACTIVE | Phase 7: Detail pages + dashboard summary |

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

## Session Continuity

**Last session:** 2026-01-22 05:12:11 UTC
**Stopped at:** Completed 06-01-PLAN.md
**Resume file:** None

---

*Last updated: 2026-01-22 (Plan 06-01 complete)*
