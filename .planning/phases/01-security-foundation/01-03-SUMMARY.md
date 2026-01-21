---
phase: 01-security-foundation
plan: 03
subsystem: data-models
tags: [prisma, seasons, eligibility, crud-api]
dependency-graph:
  requires: ["01-01"]
  provides: ["Season model", "AthleteEligibility model", "Seasons CRUD API"]
  affects: ["02-*", "03-*"]
tech-stack:
  added: []
  patterns: ["soft-delete-by-archive", "optional-date-range"]
key-files:
  created:
    - prisma/schema.prisma (Season, AthleteEligibility models)
    - src/lib/validations/season.ts
    - src/app/api/seasons/route.ts
    - src/app/api/seasons/[id]/route.ts
  modified: []
decisions:
  - id: DEC-01-03-01
    decision: "Soft delete seasons by archiving"
    rationale: "Preserve historical data and relationships (practices, regattas, eligibility)"
  - id: DEC-01-03-02
    decision: "Multiple active seasons allowed"
    rationale: "Teams may run overlapping programs (Fall Racing, Novice Training)"
metrics:
  duration: "3m"
  completed: "2026-01-21"
---

# Phase 1 Plan 3: Season & Eligibility Data Models Summary

Season and AthleteEligibility models with CRUD API for managing rowing seasons and per-season athlete eligibility tracking.

## What Was Built

### Prisma Schema Additions

**SeasonStatus enum:**
- ACTIVE - Season is currently running
- ARCHIVED - Season is soft-deleted/historical

**Season model:**
- `id`, `teamId`, `name` (required)
- `startDate`, `endDate` (optional DateTime)
- `status` (defaults to ACTIVE)
- Relation to Team (cascade delete)
- Relation to AthleteEligibility[]
- Indexes: `[teamId]`, `[teamId, status]`

**AthleteEligibility model:**
- `id`, `seasonId`, `athleteId` (required)
- `isEligible` (manual override flag, default false)
- `waiverSigned`, `swimTestPassed` (default false)
- `customFields` (JSON for team-defined requirements)
- Relations to Season and AthleteProfile (cascade delete)
- Unique constraint: `[seasonId, athleteId]`
- Indexes: `[seasonId]`, `[athleteId]`

### Validation Schemas

**createSeasonSchema:**
- `name`: required, 1-100 chars
- `startDate`: optional ISO datetime
- `endDate`: optional ISO datetime (must be >= startDate if both provided)

**updateSeasonSchema:**
- All fields optional
- Adds `status`: ACTIVE | ARCHIVED

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/seasons | Team member | List seasons with optional status filter |
| POST | /api/seasons | Coach only | Create new season |
| GET | /api/seasons/:id | Team member | Get season with eligibility count |
| PATCH | /api/seasons/:id | Coach only | Update season |
| DELETE | /api/seasons/:id | Coach only | Archive season (soft delete) |

## Commits

| Hash | Message |
|------|---------|
| 622725d | feat(01-03): add Season and AthleteEligibility models |
| 693ac9c | feat(01-03): add season CRUD API and validation schemas |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Soft delete by archiving** - DELETE endpoint sets status to ARCHIVED rather than removing records. This preserves historical data and prevents orphaned references from practices/regattas that will be linked in Phase 2.

2. **Multiple active seasons** - No constraint on number of active seasons. Teams can run overlapping programs simultaneously.

## Next Phase Readiness

### Provides for Future Plans

- **Season model** ready for Practice/Regatta relations (Phase 2)
- **AthleteEligibility model** ready for eligibility UI (Phase 2)
- **CRUD API** ready for season management UI

### No Blockers

All success criteria met. Ready to proceed with remaining Phase 1 plans.
