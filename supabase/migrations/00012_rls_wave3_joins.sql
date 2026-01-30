-- RLS Wave 3: Shallow JOINs (13 Tables)
-- Tables 1-2 levels deep - use EXISTS with JOIN
-- Run this in Supabase SQL Editor after Wave 2 migration

-- =============================================================================
-- Enable RLS on Wave 3 Tables
-- =============================================================================

ALTER TABLE "PracticeBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lineup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LandAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TemplateSeat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutTemplateInterval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntryLineup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AthleteEligibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EquipmentUsageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EquipmentBooking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PracticeBlock Policies (via Practice)
-- =============================================================================

-- All team members can view practice blocks
CREATE POLICY "practice_block_select" ON "PracticeBlock"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Practice" p
      WHERE p.id = "PracticeBlock"."practiceId"
      AND p."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert practice blocks
CREATE POLICY "practice_block_insert" ON "PracticeBlock"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Practice" p
      WHERE p.id = "PracticeBlock"."practiceId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update practice blocks
CREATE POLICY "practice_block_update" ON "PracticeBlock"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Practice" p
      WHERE p.id = "PracticeBlock"."practiceId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Practice" p
      WHERE p.id = "PracticeBlock"."practiceId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete practice blocks
CREATE POLICY "practice_block_delete" ON "PracticeBlock"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Practice" p
      WHERE p.id = "PracticeBlock"."practiceId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- Lineup Policies (via PracticeBlock -> Practice)
-- =============================================================================

-- All team members can view lineups
CREATE POLICY "lineup_select" ON "Lineup"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Lineup"."blockId"
      AND p."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert lineups
CREATE POLICY "lineup_insert" ON "Lineup"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Lineup"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update lineups
CREATE POLICY "lineup_update" ON "Lineup"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Lineup"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Lineup"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete lineups
CREATE POLICY "lineup_delete" ON "Lineup"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Lineup"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- Workout Policies (via PracticeBlock -> Practice)
-- =============================================================================

-- All team members can view workouts
CREATE POLICY "workout_select" ON "Workout"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Workout"."blockId"
      AND p."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert workouts
CREATE POLICY "workout_insert" ON "Workout"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Workout"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update workouts
CREATE POLICY "workout_update" ON "Workout"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Workout"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Workout"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete workouts
CREATE POLICY "workout_delete" ON "Workout"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "Workout"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- LandAssignment Policies (via PracticeBlock -> Practice)
-- =============================================================================

-- All team members can view land assignments
CREATE POLICY "land_assignment_select" ON "LandAssignment"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "LandAssignment"."blockId"
      AND p."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert land assignments
CREATE POLICY "land_assignment_insert" ON "LandAssignment"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "LandAssignment"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update land assignments
CREATE POLICY "land_assignment_update" ON "LandAssignment"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "LandAssignment"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "LandAssignment"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete land assignments
CREATE POLICY "land_assignment_delete" ON "LandAssignment"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeBlock" pb
      JOIN "Practice" p ON p.id = pb."practiceId"
      WHERE pb.id = "LandAssignment"."blockId"
      AND p."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- TemplateBlock Policies (via PracticeTemplate)
-- =============================================================================

-- All team members can view template blocks
CREATE POLICY "template_block_select" ON "TemplateBlock"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeTemplate" pt
      WHERE pt.id = "TemplateBlock"."templateId"
      AND pt."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert template blocks
CREATE POLICY "template_block_insert" ON "TemplateBlock"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeTemplate" pt
      WHERE pt.id = "TemplateBlock"."templateId"
      AND pt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update template blocks
CREATE POLICY "template_block_update" ON "TemplateBlock"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeTemplate" pt
      WHERE pt.id = "TemplateBlock"."templateId"
      AND pt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "PracticeTemplate" pt
      WHERE pt.id = "TemplateBlock"."templateId"
      AND pt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete template blocks
CREATE POLICY "template_block_delete" ON "TemplateBlock"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "PracticeTemplate" pt
      WHERE pt.id = "TemplateBlock"."templateId"
      AND pt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- TemplateSeat Policies (via LineupTemplate)
-- =============================================================================

-- All team members can view template seats
CREATE POLICY "template_seat_select" ON "TemplateSeat"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "LineupTemplate" lt
      WHERE lt.id = "TemplateSeat"."templateId"
      AND lt."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert template seats
CREATE POLICY "template_seat_insert" ON "TemplateSeat"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "LineupTemplate" lt
      WHERE lt.id = "TemplateSeat"."templateId"
      AND lt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update template seats
CREATE POLICY "template_seat_update" ON "TemplateSeat"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "LineupTemplate" lt
      WHERE lt.id = "TemplateSeat"."templateId"
      AND lt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "LineupTemplate" lt
      WHERE lt.id = "TemplateSeat"."templateId"
      AND lt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete template seats
CREATE POLICY "template_seat_delete" ON "TemplateSeat"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "LineupTemplate" lt
      WHERE lt.id = "TemplateSeat"."templateId"
      AND lt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- WorkoutTemplateInterval Policies (via WorkoutTemplate)
-- =============================================================================

-- All team members can view workout template intervals
CREATE POLICY "workout_template_interval_select" ON "WorkoutTemplateInterval"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WorkoutTemplate" wt
      WHERE wt.id = "WorkoutTemplateInterval"."templateId"
      AND wt."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert workout template intervals
CREATE POLICY "workout_template_interval_insert" ON "WorkoutTemplateInterval"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WorkoutTemplate" wt
      WHERE wt.id = "WorkoutTemplateInterval"."templateId"
      AND wt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update workout template intervals
CREATE POLICY "workout_template_interval_update" ON "WorkoutTemplateInterval"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WorkoutTemplate" wt
      WHERE wt.id = "WorkoutTemplateInterval"."templateId"
      AND wt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WorkoutTemplate" wt
      WHERE wt.id = "WorkoutTemplateInterval"."templateId"
      AND wt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete workout template intervals
CREATE POLICY "workout_template_interval_delete" ON "WorkoutTemplateInterval"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "WorkoutTemplate" wt
      WHERE wt.id = "WorkoutTemplateInterval"."templateId"
      AND wt."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- Entry Policies (via Regatta)
-- =============================================================================

-- All team members can view entries
CREATE POLICY "entry_select" ON "Entry"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Regatta" r
      WHERE r.id = "Entry"."regattaId"
      AND r."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert entries
CREATE POLICY "entry_insert" ON "Entry"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Regatta" r
      WHERE r.id = "Entry"."regattaId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update entries
CREATE POLICY "entry_update" ON "Entry"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Regatta" r
      WHERE r.id = "Entry"."regattaId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Regatta" r
      WHERE r.id = "Entry"."regattaId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete entries
CREATE POLICY "entry_delete" ON "Entry"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Regatta" r
      WHERE r.id = "Entry"."regattaId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- EntryLineup Policies (via Entry -> Regatta)
-- =============================================================================

-- All team members can view entry lineups
CREATE POLICY "entry_lineup_select" ON "EntryLineup"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "EntryLineup"."entryId"
      AND r."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert entry lineups
CREATE POLICY "entry_lineup_insert" ON "EntryLineup"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "EntryLineup"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update entry lineups
CREATE POLICY "entry_lineup_update" ON "EntryLineup"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "EntryLineup"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "EntryLineup"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete entry lineups
CREATE POLICY "entry_lineup_delete" ON "EntryLineup"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "EntryLineup"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- NotificationConfig Policies (via Entry -> Regatta)
-- =============================================================================

-- All team members can view notification configs
CREATE POLICY "notification_config_select" ON "NotificationConfig"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "NotificationConfig"."entryId"
      AND r."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert notification configs
CREATE POLICY "notification_config_insert" ON "NotificationConfig"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "NotificationConfig"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update notification configs
CREATE POLICY "notification_config_update" ON "NotificationConfig"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "NotificationConfig"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "NotificationConfig"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete notification configs
CREATE POLICY "notification_config_delete" ON "NotificationConfig"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Entry" e
      JOIN "Regatta" r ON r.id = e."regattaId"
      WHERE e.id = "NotificationConfig"."entryId"
      AND r."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- AthleteEligibility Policies (via Season)
-- =============================================================================

-- All team members can view eligibility records
CREATE POLICY "athlete_eligibility_select" ON "AthleteEligibility"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Season" s
      WHERE s.id = "AthleteEligibility"."seasonId"
      AND s."teamId" = public.get_current_club_id()
    )
  );

-- Coaches and above can insert eligibility records
CREATE POLICY "athlete_eligibility_insert" ON "AthleteEligibility"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Season" s
      WHERE s.id = "AthleteEligibility"."seasonId"
      AND s."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can update eligibility records
CREATE POLICY "athlete_eligibility_update" ON "AthleteEligibility"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Season" s
      WHERE s.id = "AthleteEligibility"."seasonId"
      AND s."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Season" s
      WHERE s.id = "AthleteEligibility"."seasonId"
      AND s."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- Coaches and above can delete eligibility records
CREATE POLICY "athlete_eligibility_delete" ON "AthleteEligibility"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Season" s
      WHERE s.id = "AthleteEligibility"."seasonId"
      AND s."teamId" = public.get_current_club_id()
    ) AND public.is_coach_or_higher()
  );

-- =============================================================================
-- EquipmentUsageLog Policies (has denormalized teamId)
-- =============================================================================

-- All team members can view usage logs
CREATE POLICY "equipment_usage_log_select" ON "EquipmentUsageLog"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert usage logs
CREATE POLICY "equipment_usage_log_insert" ON "EquipmentUsageLog"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update usage logs
CREATE POLICY "equipment_usage_log_update" ON "EquipmentUsageLog"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete usage logs
CREATE POLICY "equipment_usage_log_delete" ON "EquipmentUsageLog"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- EquipmentBooking Policies (has clubId)
-- =============================================================================

-- Club members can view bookings for their club
CREATE POLICY "equipment_booking_select" ON "EquipmentBooking"
  FOR SELECT TO authenticated
  USING ("clubId" = public.get_current_club_id());

-- Coaches and above can insert bookings
CREATE POLICY "equipment_booking_insert" ON "EquipmentBooking"
  FOR INSERT TO authenticated
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update bookings
CREATE POLICY "equipment_booking_update" ON "EquipmentBooking"
  FOR UPDATE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete bookings
CREATE POLICY "equipment_booking_delete" ON "EquipmentBooking"
  FOR DELETE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- AuditLog Policies (has clubId, restricted access)
-- =============================================================================

-- Club admins can view audit logs for their club
CREATE POLICY "audit_log_select" ON "AuditLog"
  FOR SELECT TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Audit logs are insert-only via service role (no user insert policy)
-- No update or delete policies - audit logs are immutable

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these after applying to verify RLS is enabled and policies exist:
--
-- Check RLS is enabled on tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'PracticeBlock', 'Lineup', 'Workout', 'LandAssignment',
--     'TemplateBlock', 'TemplateSeat', 'WorkoutTemplateInterval',
--     'Entry', 'EntryLineup', 'NotificationConfig',
--     'AthleteEligibility', 'EquipmentUsageLog', 'EquipmentBooking', 'AuditLog'
--   );
--
-- Check policies exist:
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'PracticeBlock', 'Lineup', 'Workout', 'LandAssignment',
--     'TemplateBlock', 'TemplateSeat', 'WorkoutTemplateInterval',
--     'Entry', 'EntryLineup', 'NotificationConfig',
--     'AthleteEligibility', 'EquipmentUsageLog', 'EquipmentBooking', 'AuditLog'
--   )
-- ORDER BY tablename, policyname;

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- DROP POLICY IF EXISTS "practice_block_select" ON "PracticeBlock";
-- DROP POLICY IF EXISTS "practice_block_insert" ON "PracticeBlock";
-- DROP POLICY IF EXISTS "practice_block_update" ON "PracticeBlock";
-- DROP POLICY IF EXISTS "practice_block_delete" ON "PracticeBlock";
-- ALTER TABLE "PracticeBlock" DISABLE ROW LEVEL SECURITY;
-- (repeat for all tables)
