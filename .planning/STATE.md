# RowOps Project State

## Project Reference

**Core Value:** Coaches can plan practices with lineups and equipment, and athletes know where to be and what boat they're in.

**Current Focus:** Phase 1 - Security & Foundation

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 of 5 (Security & Foundation) |
| Plan | 4 of 5 complete |
| Status | In progress |
| Last activity | 2026-01-21 - Completed 01-04-PLAN.md |

**Progress:**
```
Phase 1: [########..] 80% (4/5 plans)
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
| Plans completed | 4 |
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
| Rate limit before auth | For anonymous endpoints, rate limit check runs before auth to prevent brute-force even without valid credentials | 1 |
| Graceful rate limit fallback | When Upstash env vars not configured, rate limiting disabled (not broken) for development-friendly behavior | 1 |
| Soft delete seasons by archiving | Preserve historical data and relationships (practices, regattas, eligibility) | 1 |
| Multiple active seasons allowed | Teams may run overlapping programs (Fall Racing, Novice Training) | 1 |
| Athletes see missing requirements | Clear visibility into what's blocking eligibility improves athlete experience | 1 |
| Upsert on eligibility PATCH | Creates record if not exists, simplifying coach workflow | 1 |

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
| Rate-limit-first | `const clientIp = getClientIp(request); const rateLimit = await checkRateLimit(clientIp, 'action');` | Anonymous/sensitive endpoints |
| Soft-delete-archive | `status: 'ARCHIVED'` instead of hard delete | Season, Equipment |
| Role-based-visibility | Different data returned based on user_role (coach sees all, athlete sees self) | Eligibility endpoints |

### Todos

- None yet

### Blockers

- Node.js 18.x doesn't meet Next.js 16 requirement (20.9.0+) - using tsc for verification

## Session Continuity

### Last Session

- **Date:** 2026-01-21
- **Activity:** Executed 01-04-PLAN.md (Eligibility Management API)
- **Outcome:** Eligibility API endpoints with role-based visibility

### Next Actions

1. Execute 01-05-PLAN.md (remaining Phase 1 plan)
2. Phase 1 remaining: 1 plan

### Files Modified This Session

- `src/lib/validations/eligibility.ts` (created)
- `src/app/api/seasons/[id]/eligibility/route.ts` (created)
- `src/app/api/seasons/[id]/eligibility/[athleteId]/route.ts` (created)
- `.planning/phases/01-security-foundation/01-04-SUMMARY.md` (created)

---

*Last updated: 2026-01-21*
