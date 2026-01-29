# Radl Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Between milestones — v2.3 shipped, ready for v3.0

## Current Position

| Field | Value |
|-------|-------|
| Milestone | None active |
| Last shipped | v2.3 Core Flow Testing |
| Status | Ready for next milestone |
| Last activity | 2026-01-29 - Shipped v2.3 |

**Progress:**
```
v1.0: [##########] 100% SHIPPED (2026-01-22)
v1.1: [##########] 100% SHIPPED (2026-01-22) — 9/11 reqs, 2 deferred
v2.0: [##########] 100% SHIPPED (2026-01-26) — 34/34 requirements
v2.1: [##########] 100% SHIPPED (2026-01-27) — 30/30 requirements
v2.2: [##########] 100% SHIPPED (2026-01-29) — 33/35 requirements
v2.3: [##########] 100% SHIPPED (2026-01-29) — 20/20 requirements
```

**Total:** 6 milestones, 31 phases, 157/161 requirements delivered

## Shipped Milestones

### v2.3 Core Flow Testing (2026-01-29)

**Delivered:** 20 requirements across 4 phases (28-31)

**Accomplishments:**
- End-to-end verification of onboarding, practice, and equipment flows
- Bug fixes: signup redirect, team creation, invitation UX, empty states
- Form validation standardized with onTouched mode
- Actionable error messages with examples
- Settings page cleanup, 44px touch targets verified

### v2.2 Security Audit (2026-01-29)

**Delivered:** 33 requirements across 3 phases (25-27)

**Accomplishments:**
- 88 API routes audited (all protected or justified public)
- 163 security tests (109 CASL, 17 API, 17 role propagation, 20 pgTAP)
- Bundle secrets scanner + GitHub Actions CI/CD
- Immutable audit logging with 8 auth event types
- Auth rate limiting (5/15min login, 3/hr signup)

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
| RC connection testing | DEFERRED | Needs RC_CLIENT_ID and RC_CLIENT_SECRET |
| QR external scanning | DEFERRED | Needs production deployment |
| Push notifications | DEFERRED | NOTIF-01, NOTIF-02 for v3.0 |
| Dynamic team colors | DEFERRED | Color settings stored in DB, UI uses fixed emerald |
| CASL migration | IDENTIFIED | 59 routes use legacy getClaimsForApiRoute pattern |
| Vitest framework | ADDED | 26-02 - Unit test infrastructure |
| pgTAP RLS tests | CREATED | 26-04 - 20 tests awaiting multi-tenant data |
| Equipment RLS | RESOLVED | 00004_equipment_rls.sql enables RLS with 4 policies |

## Next Steps

Use `/gsd:new-milestone` to start v3.0 planning.

v3.0 candidates:
- Push notifications (NOTIF-01, NOTIF-02)
- Native mobile apps (iOS, Android)
- Season templates
- RC team-specific OAuth integration
- Email digest notifications
- Parent role with ParentAthleteLink

## Session Continuity

| Field | Value |
|-------|-------|
| Last session | 2026-01-29 |
| Stopped at | Shipped v2.3 milestone |
| Resume with | `/gsd:new-milestone` |

---

*Last updated: 2026-01-29 (v2.3 shipped)*
