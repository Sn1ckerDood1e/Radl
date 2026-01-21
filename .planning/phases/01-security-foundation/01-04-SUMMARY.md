---
phase: 01-security-foundation
plan: 04
subsystem: eligibility-api
tags: [eligibility, api, authorization, zod]
dependency-graph:
  requires: ["01-01", "01-03"]
  provides: ["Eligibility API endpoints", "Eligibility validation schemas"]
  affects: ["02-*"]
tech-stack:
  added: []
  patterns: ["role-based-visibility", "missing-requirements-calculation"]
key-files:
  created:
    - src/lib/validations/eligibility.ts
    - src/app/api/seasons/[id]/eligibility/route.ts
    - src/app/api/seasons/[id]/eligibility/[athleteId]/route.ts
  modified: []
decisions:
  - id: DEC-01-04-01
    decision: "Athletes see missing requirements list"
    rationale: "Clear visibility into what's blocking eligibility improves athlete experience"
  - id: DEC-01-04-02
    decision: "Upsert on PATCH for individual eligibility"
    rationale: "Creates record if not exists, simplifying coach workflow"
metrics:
  duration: "5m"
  completed: "2026-01-21"
---

# Phase 1 Plan 4: Eligibility Management API Summary

Eligibility API endpoints for coaches to track and athletes to view per-season eligibility status with waiver, swim test, and custom field tracking.

## What Was Built

### Validation Schemas

**updateEligibilitySchema:**
- `isEligible`: optional boolean (manual override)
- `waiverSigned`: optional boolean
- `swimTestPassed`: optional boolean
- `customFields`: optional Record<string, boolean>

**bulkEligibilitySchema:**
- `athleteIds`: array of UUIDs
- `defaults`: optional object with default values for bulk creation

**addCustomFieldSchema:**
- `fieldName`: 1-50 chars
- `defaultValue`: boolean (default false)

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/seasons/:id/eligibility | Team member | List eligibility (coaches: all, athletes: self) |
| POST | /api/seasons/:id/eligibility | Coach only | Bulk create eligibility records |
| GET | /api/seasons/:id/eligibility/:athleteId | Team member | Get single athlete's eligibility |
| PATCH | /api/seasons/:id/eligibility/:athleteId | Coach only | Update athlete's eligibility |

### Role-Based Visibility

**Coaches:**
- See all athletes' eligibility for the season
- Can update any athlete's eligibility status
- Can bulk-create eligibility records for multiple athletes

**Athletes:**
- See only their own eligibility status
- Receive calculated "missing" list (waiver not signed, swim test not passed, incomplete custom fields)
- Cannot modify eligibility

### Authorization Pattern

All endpoints:
1. Verify user authenticated via claims helper
2. Verify season belongs to user's team
3. For individual athlete endpoints: verify athlete belongs to team
4. Coach-only operations enforce role check

## Commits

| Hash | Message |
|------|---------|
| f62330d | feat(01-04): add eligibility validation schemas |
| a4ecd76 | feat(01-04): add season eligibility list and bulk create endpoint |
| 6874d33 | feat(01-04): add individual athlete eligibility endpoint |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Athletes see missing requirements** - The API calculates and returns a "missing" array for athletes, showing exactly what they need to complete (waiver, swim test, custom fields). This provides immediate visibility without requiring the athlete to interpret raw boolean fields.

2. **Upsert on PATCH** - The PATCH endpoint uses upsert to create the eligibility record if it doesn't exist. This simplifies the coach workflow - they can update any athlete without needing to ensure the record was pre-created.

## Next Phase Readiness

### Provides for Future Plans

- **Eligibility API** ready for eligibility management UI (Phase 2)
- **Missing requirements calculation** can be displayed in athlete dashboard
- **Bulk creation** supports season initialization workflows

### No Blockers

All success criteria met:
- GET /api/seasons/:id/eligibility returns all athletes (coach) or self (athlete)
- POST /api/seasons/:id/eligibility bulk creates eligibility records
- GET /api/seasons/:id/eligibility/:athleteId returns single athlete's eligibility
- PATCH /api/seasons/:id/eligibility/:athleteId updates eligibility (coach only)
- Athletes see "missing" items
- All routes use centralized claims helper
- Coach-only restrictions enforced
