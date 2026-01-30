-- RLS Wave 4: Policies for Deep JOIN Tables
-- Enable RLS and create policies using denormalized teamId
-- Run this in Supabase SQL Editor after Wave 4 triggers migration

-- =============================================================================
-- Enable RLS on Wave 4 Tables
-- =============================================================================

ALTER TABLE "SeatAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutInterval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntrySeat" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SeatAssignment Policies
-- Uses denormalized teamId for efficient lookups
-- =============================================================================

-- All team members can view seat assignments
CREATE POLICY "seat_assignment_select" ON "SeatAssignment"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert seat assignments
CREATE POLICY "seat_assignment_insert" ON "SeatAssignment"
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Verify teamId matches via lineup path (trigger will populate teamId)
    EXISTS (
      SELECT 1 FROM "Lineup" l
      JOIN "PracticeBlock" pb ON pb.id = l."blockId"
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE l.id = "SeatAssignment"."lineupId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update seat assignments
CREATE POLICY "seat_assignment_update" ON "SeatAssignment"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete seat assignments
CREATE POLICY "seat_assignment_delete" ON "SeatAssignment"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- WorkoutInterval Policies
-- Uses denormalized teamId for efficient lookups
-- =============================================================================

-- All team members can view workout intervals
CREATE POLICY "workout_interval_select" ON "WorkoutInterval"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert workout intervals
CREATE POLICY "workout_interval_insert" ON "WorkoutInterval"
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Verify teamId matches via workout path (trigger will populate teamId)
    EXISTS (
      SELECT 1 FROM "Workout" w
      JOIN "PracticeBlock" pb ON pb.id = w."blockId"
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE w.id = "WorkoutInterval"."workoutId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update workout intervals
CREATE POLICY "workout_interval_update" ON "WorkoutInterval"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete workout intervals
CREATE POLICY "workout_interval_delete" ON "WorkoutInterval"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- EntrySeat Policies
-- Uses denormalized teamId for efficient lookups
-- =============================================================================

-- All team members can view entry seats
CREATE POLICY "entry_seat_select" ON "EntrySeat"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert entry seats
CREATE POLICY "entry_seat_insert" ON "EntrySeat"
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Verify teamId matches via entry lineup path (trigger will populate teamId)
    EXISTS (
      SELECT 1 FROM "EntryLineup" el
      JOIN "Entry" e ON e.id = el."entryId"
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE el.id = "EntrySeat"."entryLineupId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update entry seats
CREATE POLICY "entry_seat_update" ON "EntrySeat"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete entry seats
CREATE POLICY "entry_seat_delete" ON "EntrySeat"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these after applying to verify RLS is enabled and policies exist:
--
-- Check RLS is enabled on tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('SeatAssignment', 'WorkoutInterval', 'EntrySeat');
--
-- Check policies exist:
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('SeatAssignment', 'WorkoutInterval', 'EntrySeat')
-- ORDER BY tablename, policyname;
--
-- Expected policies per table:
-- - SeatAssignment: seat_assignment_select, seat_assignment_insert,
--                   seat_assignment_update, seat_assignment_delete
-- - WorkoutInterval: workout_interval_select, workout_interval_insert,
--                    workout_interval_update, workout_interval_delete
-- - EntrySeat: entry_seat_select, entry_seat_insert,
--              entry_seat_update, entry_seat_delete

-- =============================================================================
-- Full RLS Coverage Verification
-- =============================================================================
-- After all Wave migrations, run this to verify all 39 tables have RLS:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT LIKE '_prisma%'
--   AND tablename NOT LIKE 'pg_%'
-- ORDER BY tablename;
--
-- All tables should show rowsecurity = true

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- DROP POLICY IF EXISTS "seat_assignment_select" ON "SeatAssignment";
-- DROP POLICY IF EXISTS "seat_assignment_insert" ON "SeatAssignment";
-- DROP POLICY IF EXISTS "seat_assignment_update" ON "SeatAssignment";
-- DROP POLICY IF EXISTS "seat_assignment_delete" ON "SeatAssignment";
-- ALTER TABLE "SeatAssignment" DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "workout_interval_select" ON "WorkoutInterval";
-- DROP POLICY IF EXISTS "workout_interval_insert" ON "WorkoutInterval";
-- DROP POLICY IF EXISTS "workout_interval_update" ON "WorkoutInterval";
-- DROP POLICY IF EXISTS "workout_interval_delete" ON "WorkoutInterval";
-- ALTER TABLE "WorkoutInterval" DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "entry_seat_select" ON "EntrySeat";
-- DROP POLICY IF EXISTS "entry_seat_insert" ON "EntrySeat";
-- DROP POLICY IF EXISTS "entry_seat_update" ON "EntrySeat";
-- DROP POLICY IF EXISTS "entry_seat_delete" ON "EntrySeat";
-- ALTER TABLE "EntrySeat" DISABLE ROW LEVEL SECURITY;
