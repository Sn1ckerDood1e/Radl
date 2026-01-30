-- RLS Wave 4: Backfill Denormalized teamId Values
-- Populate teamId from parent relationships for existing data
-- Run this in Supabase SQL Editor after Wave 4 schema migration

-- =============================================================================
-- Backfill SeatAssignment.teamId
-- Path: SeatAssignment -> Lineup -> PracticeBlock -> Practice -> teamId
-- =============================================================================

UPDATE "SeatAssignment" sa
SET "teamId" = (
  SELECT p."teamId"
  FROM "Lineup" l
  JOIN "PracticeBlock" pb ON pb.id = l."blockId"
  JOIN "Practice" p ON p.id = pb."practiceId"
  WHERE l.id = sa."lineupId"
)
WHERE sa."teamId" IS NULL;

-- =============================================================================
-- Backfill WorkoutInterval.teamId
-- Path: WorkoutInterval -> Workout -> PracticeBlock -> Practice -> teamId
-- =============================================================================

UPDATE "WorkoutInterval" wi
SET "teamId" = (
  SELECT p."teamId"
  FROM "Workout" w
  JOIN "PracticeBlock" pb ON pb.id = w."blockId"
  JOIN "Practice" p ON p.id = pb."practiceId"
  WHERE w.id = wi."workoutId"
)
WHERE wi."teamId" IS NULL;

-- =============================================================================
-- Backfill EntrySeat.teamId
-- Path: EntrySeat -> EntryLineup -> Entry -> Regatta -> teamId
-- =============================================================================

UPDATE "EntrySeat" es
SET "teamId" = (
  SELECT r."teamId"
  FROM "EntryLineup" el
  JOIN "Entry" e ON e.id = el."entryId"
  JOIN "Regatta" r ON r.id = e."regattaId"
  WHERE el.id = es."entryLineupId"
)
WHERE es."teamId" IS NULL;

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these after applying to verify backfill completed:
--
-- Check for any remaining NULL teamId values:
-- SELECT 'SeatAssignment' as table_name, COUNT(*) as null_count
-- FROM "SeatAssignment" WHERE "teamId" IS NULL
-- UNION ALL
-- SELECT 'WorkoutInterval', COUNT(*)
-- FROM "WorkoutInterval" WHERE "teamId" IS NULL
-- UNION ALL
-- SELECT 'EntrySeat', COUNT(*)
-- FROM "EntrySeat" WHERE "teamId" IS NULL;
--
-- Expected output: All counts should be 0

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- UPDATE "SeatAssignment" SET "teamId" = NULL;
-- UPDATE "WorkoutInterval" SET "teamId" = NULL;
-- UPDATE "EntrySeat" SET "teamId" = NULL;
