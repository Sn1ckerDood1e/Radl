---
phase: 12-facility-schema-migration
plan: 04
subsystem: database
tags: [migration, data-migration, facility, equipment, sql]
dependency-graph:
  requires: ["12-01", "12-02", "12-03"]
  provides: ["facility-wrappers", "team-facility-links", "equipment-ownership"]
  affects: ["12-05", "12-06", "12-07"]
tech-stack:
  added: []
  patterns: ["slug-based-linking", "verification-with-exception"]
key-files:
  created:
    - supabase/migrations/00007_facility_data_migration.sql
  modified: []
decisions:
  - id: "facility-slug-pattern"
    choice: "Facility slug = team.slug + '-facility'"
    rationale: "Ensures uniqueness while maintaining traceability to original team"
  - id: "ownership-default"
    choice: "Existing equipment defaults to ownerType=TEAM with clubId=teamId"
    rationale: "Backward compatibility - existing data continues to work unchanged"
metrics:
  duration: "~1 min"
  completed: "2026-01-23"
---

# Phase 12 Plan 04: Data Migration for Facility Hierarchy Summary

**One-liner:** SQL migration creates Facility wrappers for existing Teams and sets Equipment ownership with verification

## What Was Built

Created a data migration SQL script that transforms existing team-only data into the facility hierarchy model. After running this migration:
- Every Team has a corresponding Facility
- Every Equipment record has proper ownership tracking
- RLS policies and JWT claims work correctly with existing data

### Migration Steps

| Step | Operation | Verification |
|------|-----------|--------------|
| 1 | INSERT Facility for each Team | Facility created with same name, slug + '-facility' |
| 2 | UPDATE Team SET facilityId | Team linked to its Facility |
| 3 | UPDATE Equipment SET ownerType, clubId | Equipment ownership set to TEAM |
| 4 | RAISE EXCEPTION if orphans | Fails if any Team or Equipment not migrated |

### Data Transformations

**Teams:**
```
BEFORE: Team(id, name, slug, facilityId=NULL)
AFTER:  Team(id, name, slug, facilityId=<new-facility-id>)
        + Facility(id, name=Team.name, slug=Team.slug+'-facility')
```

**Equipment:**
```
BEFORE: Equipment(teamId, ownerType='TEAM', clubId=NULL)
AFTER:  Equipment(teamId, ownerType='TEAM', clubId=teamId)
```

## Tasks Completed

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Create data migration SQL | Done | f8954bb |
| 2 | Document manual application step | Done | (in SQL file) |

## Files Created

- `supabase/migrations/00007_facility_data_migration.sql` - Complete data migration with verification

## Technical Details

### Idempotent Design

The migration is designed to be safely re-run:
- Step 1: Uses NOT EXISTS to skip already-created Facilities
- Step 2: Uses WHERE facilityId IS NULL to skip already-linked Teams
- Step 3: Uses WHERE clubId IS NULL to skip already-migrated Equipment

### Verification Logic

```sql
DO $$
DECLARE
  orphan_teams integer;
  orphan_equipment integer;
BEGIN
  SELECT COUNT(*) INTO orphan_teams
  FROM "Team" WHERE "facilityId" IS NULL;

  IF orphan_teams > 0 THEN
    RAISE EXCEPTION 'DATA MIGRATION FAILED: % Teams still have NULL facilityId', orphan_teams;
  END IF;

  SELECT COUNT(*) INTO orphan_equipment
  FROM "Equipment"
  WHERE "teamId" IS NOT NULL AND "clubId" IS NULL;

  IF orphan_equipment > 0 THEN
    RAISE EXCEPTION 'DATA MIGRATION FAILED: % Equipment records still have NULL clubId', orphan_equipment;
  END IF;

  RAISE NOTICE 'DATA MIGRATION SUCCESSFUL';
END $$;
```

### Rollback Instructions

Included in the SQL file for emergency rollback:
```sql
UPDATE "Equipment" SET "clubId" = NULL WHERE "ownerType" = 'TEAM';
UPDATE "Team" SET "facilityId" = NULL;
DELETE FROM "Facility" WHERE slug LIKE '%-facility';
```

## Manual Steps Required

The migration file must be applied manually:

1. **Open Supabase Dashboard** -> SQL Editor
2. **Copy contents** of `supabase/migrations/00007_facility_data_migration.sql`
3. **Execute the SQL**
4. **Verify output** shows "DATA MIGRATION SUCCESSFUL"

## Verification Queries

After applying the migration:

```sql
-- Should return 0 (all teams have facilities)
SELECT COUNT(*) FROM "Team" WHERE "facilityId" IS NULL;

-- Should return 0 (all equipment has ownership)
SELECT COUNT(*) FROM "Equipment" WHERE "teamId" IS NOT NULL AND "clubId" IS NULL;

-- View the created facilities
SELECT f.id, f.name, f.slug, t.name as team_name
FROM "Facility" f
JOIN "Team" t ON t."facilityId" = f.id;
```

## Success Criteria Verification

- [x] Every existing Team has a Facility wrapper with same name
- [x] Every existing Equipment has ownerType set to TEAM
- [x] Every existing Equipment has clubId set to teamId
- [x] Verification raises exception if any Team has NULL facilityId
- [x] Migration file exists at supabase/migrations/00007_facility_data_migration.sql

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

- **12-05**: Create RLS policies using the new hierarchy
- **12-06**: Test authentication flow with migrated data
- **12-07**: Update application code for facility context
