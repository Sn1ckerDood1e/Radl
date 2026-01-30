-- RLS Wave 4: Schema Changes for Deep JOINs (3 Tables)
-- Add denormalized teamId columns to deeply nested tables
-- Run this in Supabase SQL Editor after Wave 3 migration

-- =============================================================================
-- Add teamId Columns
-- =============================================================================

-- SeatAssignment: Lineup -> PracticeBlock -> Practice -> Team (3+ levels)
ALTER TABLE "SeatAssignment"
ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- WorkoutInterval: Workout -> PracticeBlock -> Practice -> Team (3+ levels)
ALTER TABLE "WorkoutInterval"
ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- EntrySeat: EntryLineup -> Entry -> Regatta -> Team (3+ levels)
ALTER TABLE "EntrySeat"
ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- =============================================================================
-- Add Indexes for RLS Performance
-- =============================================================================

-- Index for SeatAssignment RLS lookups
CREATE INDEX IF NOT EXISTS "SeatAssignment_teamId_idx"
ON "SeatAssignment" ("teamId");

-- Index for WorkoutInterval RLS lookups
CREATE INDEX IF NOT EXISTS "WorkoutInterval_teamId_idx"
ON "WorkoutInterval" ("teamId");

-- Index for EntrySeat RLS lookups
CREATE INDEX IF NOT EXISTS "EntrySeat_teamId_idx"
ON "EntrySeat" ("teamId");

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these after applying to verify columns and indexes exist:
--
-- Check columns exist:
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('SeatAssignment', 'WorkoutInterval', 'EntrySeat')
--   AND column_name = 'teamId';
--
-- Check indexes exist:
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('SeatAssignment', 'WorkoutInterval', 'EntrySeat')
--   AND indexname LIKE '%teamId%';

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- DROP INDEX IF EXISTS "SeatAssignment_teamId_idx";
-- DROP INDEX IF EXISTS "WorkoutInterval_teamId_idx";
-- DROP INDEX IF EXISTS "EntrySeat_teamId_idx";
-- ALTER TABLE "SeatAssignment" DROP COLUMN IF EXISTS "teamId";
-- ALTER TABLE "WorkoutInterval" DROP COLUMN IF EXISTS "teamId";
-- ALTER TABLE "EntrySeat" DROP COLUMN IF EXISTS "teamId";
