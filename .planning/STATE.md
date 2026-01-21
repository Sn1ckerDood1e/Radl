# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Phase 1 - Security & Foundation

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 of 5 (Security & Foundation) |
| Plan | 1 of 5 complete |
| Status | In progress |
| Last activity | 2026-01-21 - Completed 01-01-PLAN.md |

**Progress:**
```
Phase 1: [##........] 20% (1/5 plans)
Phase 2: [..........] 0%
Phase 3: [..........] 0%
Phase 4: [..........] 0%
Phase 5: [..........] 0%

Overall:  [..........] 0/31 requirements
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements completed | 0/31 |
| Plans completed | 1 |
| Plans failed | 0 |
| Blockers resolved | 0 |

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Security first | Existing JWT gaps are active vulnerabilities. Cannot add features handling lineup/attendance data without fixing. | 1 |
| Scheduling before Lineups | Lineups are assigned to practice sessions. Data model dependency. | 2, 3 |
| Offline before Regatta | Regatta mode is primary use case for offline. Building regatta features without offline infrastructure would require rework. | 4, 5 |
| 5 phases (standard depth) | Research suggested 6 phases, consolidated push notifications into PWA phase for coherent delivery. | All |
| Claims helper returns tuple | Returns { user, claims, error } for simpler destructuring at call sites | 1 |
| Error refs only on 500s | Auth/permission errors (401/403/404) don't need refs since they're expected states | 1 |

### Architecture Notes

- **Multi-tenant:** Team-scoped data with JWT claims, application-level filtering (no RLS yet)
- **Auth:** Supabase SSR client + JWT claims for team context
- **Auth pattern:** `getClaimsForApiRoute()` uses `getUser()` before `getSession()` (security fix)
- **Stack:** Next.js 16 + Prisma 6 + Supabase
- **PWA stack:** Serwist (service worker), Dexie.js (IndexedDB), web-push (notifications)
- **External API:** Regatta Central v4 (OAuth2, per-team keys)

### Tech Debt Tracker

| Item | Status | Phase |
|------|--------|-------|
| DEBT-01: Claims helper utility | **COMPLETE** | 1 |
| DEBT-02: Refactor oversized forms | Pending | 3 |
| DEBT-03: Query caching | Pending | 4 |

### Patterns Established

| Pattern | Usage | Files |
|---------|-------|-------|
| API auth pattern | `const { user, claims, error } = await getClaimsForApiRoute(); if (error \|\| !user) return unauthorizedResponse();` | All API routes |
| Team guard | `if (!claims?.team_id) return forbiddenResponse('No team associated with user');` | Team-scoped routes |
| Role guard | `if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can...');` | Coach-only routes |

### Todos

- None yet

### Blockers

- Node.js 18.x doesn't meet Next.js 16 requirement (20.9.0+) - using tsc for verification

## Session Continuity

### Last Session

- **Date:** 2026-01-21
- **Activity:** Executed 01-01-PLAN.md (Claims helper refactor)
- **Outcome:** Centralized claims helper, 10 API routes refactored, DEBT-01 complete

### Next Actions

1. Execute 01-02-PLAN.md (Rate limiting for sensitive endpoints)
2. Phase 1 remaining: rate limiting, tenant isolation audit, season model, eligibility

### Files Modified This Session

- `src/lib/auth/claims.ts` (created)
- `src/lib/errors/index.ts` (created)
- `src/lib/auth/authorize.ts` (modified)
- `src/app/api/equipment/route.ts` (modified)
- `src/app/api/equipment/[id]/route.ts` (modified)
- `src/app/api/equipment/[id]/damage-reports/[reportId]/route.ts` (modified)
- `src/app/api/invitations/route.ts` (modified)
- `src/app/api/invitations/[id]/route.ts` (modified)
- `src/app/api/invitations/bulk/route.ts` (modified)
- `src/app/api/athletes/route.ts` (modified)
- `src/app/api/athletes/[id]/route.ts` (modified)
- `src/app/api/team-settings/route.ts` (modified)
- `src/app/api/notifications/route.ts` (modified)
- `.planning/phases/01-security-foundation/01-01-SUMMARY.md` (created)

---

*Last updated: 2026-01-21*
