-- RLS Wave 4: Triggers for Auto-Populating teamId
-- Automatically set teamId on INSERT for deeply nested tables
-- Run this in Supabase SQL Editor after Wave 4 backfill migration

-- =============================================================================
-- SeatAssignment Trigger
-- Path: SeatAssignment -> Lineup -> PracticeBlock -> Practice -> teamId
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_seat_assignment_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only set if teamId is not already provided
  IF NEW."teamId" IS NULL THEN
    SELECT p."teamId" INTO NEW."teamId"
    FROM public."Lineup" l
    JOIN public."PracticeBlock" pb ON pb.id = l."blockId"
    JOIN public."Practice" p ON p.id = pb."practiceId"
    WHERE l.id = NEW."lineupId";
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS seat_assignment_set_team_id ON "SeatAssignment";

-- Create trigger
CREATE TRIGGER seat_assignment_set_team_id
  BEFORE INSERT ON "SeatAssignment"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seat_assignment_team_id();

-- =============================================================================
-- WorkoutInterval Trigger
-- Path: WorkoutInterval -> Workout -> PracticeBlock -> Practice -> teamId
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_workout_interval_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only set if teamId is not already provided
  IF NEW."teamId" IS NULL THEN
    SELECT p."teamId" INTO NEW."teamId"
    FROM public."Workout" w
    JOIN public."PracticeBlock" pb ON pb.id = w."blockId"
    JOIN public."Practice" p ON p.id = pb."practiceId"
    WHERE w.id = NEW."workoutId";
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS workout_interval_set_team_id ON "WorkoutInterval";

-- Create trigger
CREATE TRIGGER workout_interval_set_team_id
  BEFORE INSERT ON "WorkoutInterval"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workout_interval_team_id();

-- =============================================================================
-- EntrySeat Trigger
-- Path: EntrySeat -> EntryLineup -> Entry -> Regatta -> teamId
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_entry_seat_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only set if teamId is not already provided
  IF NEW."teamId" IS NULL THEN
    SELECT r."teamId" INTO NEW."teamId"
    FROM public."EntryLineup" el
    JOIN public."Entry" e ON e.id = el."entryId"
    JOIN public."Regatta" r ON r.id = e."regattaId"
    WHERE el.id = NEW."entryLineupId";
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS entry_seat_set_team_id ON "EntrySeat";

-- Create trigger
CREATE TRIGGER entry_seat_set_team_id
  BEFORE INSERT ON "EntrySeat"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_entry_seat_team_id();

-- =============================================================================
-- Grant Execute Permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.set_seat_assignment_team_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_workout_interval_team_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_entry_seat_team_id TO authenticated;

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these after applying to verify triggers exist:
--
-- Check triggers exist:
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND trigger_name IN (
--     'seat_assignment_set_team_id',
--     'workout_interval_set_team_id',
--     'entry_seat_set_team_id'
--   );
--
-- Check functions exist:
-- SELECT proname, provolatile
-- FROM pg_proc
-- WHERE proname IN (
--   'set_seat_assignment_team_id',
--   'set_workout_interval_team_id',
--   'set_entry_seat_team_id'
-- );

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- DROP TRIGGER IF EXISTS seat_assignment_set_team_id ON "SeatAssignment";
-- DROP TRIGGER IF EXISTS workout_interval_set_team_id ON "WorkoutInterval";
-- DROP TRIGGER IF EXISTS entry_seat_set_team_id ON "EntrySeat";
-- DROP FUNCTION IF EXISTS public.set_seat_assignment_team_id();
-- DROP FUNCTION IF EXISTS public.set_workout_interval_team_id();
-- DROP FUNCTION IF EXISTS public.set_entry_seat_team_id();
