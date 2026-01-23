---
phase: 10-security-foundation-rbac
plan: 10
status: complete
completed: 2026-01-23
commits:
  - c48e62c: "feat(10-10): create audit log listing endpoint"
  - 476e8f8: "feat(10-10): create audit log CSV export endpoint"
  - bedf8d3: "feat(10-10): create audit cleanup cron endpoint"
---

## Summary

Created audit log viewing, export, and retention endpoints.

## What Was Built

### Audit Log Listing API
- `GET /api/audit-logs` — paginated list with filtering
- Filters: action, userId, startDate, endDate
- Pagination: limit (max 200), offset
- CASL access control: facility admin sees all, club admin sees club, coach sees own
- Action descriptions enriched from AUDIT_ACTION_DESCRIPTIONS

### Audit Log CSV Export
- `GET /api/audit-logs/export` — downloadable CSV
- Same filters as listing endpoint
- Proper CSV escaping (commas, quotes, newlines)
- Export action itself audited as DATA_EXPORTED
- Requires both view-audit-log and export-data permissions

### Audit Cleanup Cron
- `GET /api/cron/audit-cleanup` — 365-day retention
- Protected by CRON_SECRET Bearer token
- Designed for Vercel Cron (daily at 3am UTC)
- Returns deleted count and cutoff date

## Files Created

| File | Purpose |
|------|---------|
| src/app/api/audit-logs/route.ts | List with filtering and CASL access |
| src/app/api/audit-logs/export/route.ts | CSV export with self-auditing |
| src/app/api/cron/audit-cleanup/route.ts | 365-day retention enforcement |

## Verification

- [x] TypeScript compiles (no errors in project build)
- [x] CASL accessibleBy used for role-scoped filtering
- [x] CSV export includes all log fields
- [x] Export action creates audit log entry
- [x] Cron endpoint requires authorization

## Dependencies Used

- `@casl/prisma` — accessibleBy for Prisma where clauses
- `@casl/ability` — ForbiddenError handling
- `@/lib/audit/logger` — createAuditLogger for export auditing
- `@/lib/audit/actions` — AUDIT_ACTION_DESCRIPTIONS
- `@/lib/auth/get-auth-context` — unified auth context

## Notes

- CRON_SECRET must be added to environment variables
- Vercel Cron config example provided in code comments
- accessibleBy gracefully returns empty array on ForbiddenError
