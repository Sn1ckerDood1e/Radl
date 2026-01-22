# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** v1.1 Polish — RC import UI, equipment usage display, notifications, data export

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1.1 (defining requirements) |
| Phase | None active |
| Plan | None active |
| Status | Defining requirements |
| Last activity | 2026-01-21 — v1.1 milestone started |

**Progress:**
```
v1.0: [##########] 100% SHIPPED
v1.1: [          ] 0% (defining requirements)
```

## v1.0 Summary

**Delivered:** Operational rowing team platform with practice scheduling, lineup management, PWA offline support, and regatta mode.

**Stats:**
- 5 phases, 37 plans
- 31 requirements implemented
- 79,737 LOC TypeScript
- 3 days (2026-01-20 → 2026-01-22)

**Archived:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

## Next Steps

1. Define v1.1 requirements (in progress)
2. Create roadmap with phases
3. Run `/gsd:plan-phase [N]` to start execution

## Accumulated Context

### Key Decisions

See `.planning/PROJECT.md` for full decision table with outcomes.

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering
- **Auth:** Supabase SSR client + JWT claims for team context
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)

### Tech Debt Tracker

| Item | Status | Notes |
|------|--------|-------|
| DEBT-01: Claims helper | COMPLETE | v1.0 |
| DEBT-02: Form refactoring | COMPLETE | v1.0 |
| DEBT-03: Query caching | COMPLETE | v1.0 |
| RC import UI | v1.1 ACTIVE | Settings page for connection management |
| Equipment usage display | v1.1 ACTIVE | Detail pages + dashboard summary |

### Patterns Established

See `.planning/milestones/v1.0-ROADMAP.md` for full pattern documentation.

---

*Last updated: 2026-01-21 (v1.1 milestone started)*
