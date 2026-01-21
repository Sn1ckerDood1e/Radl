-- RLS Policies for Phase 2 Tables (Equipment, Athletes)
-- Run this in Supabase SQL Editor after 00003

-- Enable RLS on all Phase 2 tables
ALTER TABLE "Equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DamageReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AthleteProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamSettings" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Equipment Policies
-- =============================================================================

-- All team members can view equipment
CREATE POLICY "equipment_select" ON "Equipment"
  FOR SELECT
  TO authenticated
  USING ("teamId" = public.get_user_team_id());

-- Only coaches can insert equipment
CREATE POLICY "equipment_insert" ON "Equipment"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "teamId" = public.get_user_team_id() AND
    public.get_user_role() = 'COACH'
  );

-- Only coaches can update equipment
CREATE POLICY "equipment_update" ON "Equipment"
  FOR UPDATE
  TO authenticated
  USING ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH')
  WITH CHECK ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- Only coaches can delete equipment
CREATE POLICY "equipment_delete" ON "Equipment"
  FOR DELETE
  TO authenticated
  USING ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- =============================================================================
-- DamageReport Policies
-- =============================================================================

-- All team members can view damage reports
CREATE POLICY "damage_report_select" ON "DamageReport"
  FOR SELECT
  TO authenticated
  USING ("teamId" = public.get_user_team_id());

-- Any authenticated team member can insert damage reports
-- Note: Anonymous/public submissions via QR code use service role (bypass RLS)
CREATE POLICY "damage_report_insert" ON "DamageReport"
  FOR INSERT
  TO authenticated
  WITH CHECK ("teamId" = public.get_user_team_id());

-- Only coaches can update damage reports (for resolving)
CREATE POLICY "damage_report_update" ON "DamageReport"
  FOR UPDATE
  TO authenticated
  USING ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH')
  WITH CHECK ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- Only coaches can delete damage reports
CREATE POLICY "damage_report_delete" ON "DamageReport"
  FOR DELETE
  TO authenticated
  USING ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- =============================================================================
-- AthleteProfile Policies
-- =============================================================================

-- Team members can view profiles of their team
-- Uses join through TeamMember to verify team membership
CREATE POLICY "athlete_profile_select" ON "AthleteProfile"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TeamMember" tm
      WHERE tm.id = "AthleteProfile"."teamMemberId"
      AND tm."teamId" = public.get_user_team_id()
    )
  );

-- Any team member can create their own profile (or coach can create for others)
CREATE POLICY "athlete_profile_insert" ON "AthleteProfile"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TeamMember" tm
      WHERE tm.id = "AthleteProfile"."teamMemberId"
      AND tm."teamId" = public.get_user_team_id()
      AND (
        tm."userId" = auth.uid()::text OR -- Own profile
        public.get_user_role() = 'COACH'  -- Coach can create any
      )
    )
  );

-- Athletes can update own profile, coaches can update any team profile
CREATE POLICY "athlete_profile_update" ON "AthleteProfile"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TeamMember" tm
      WHERE tm.id = "AthleteProfile"."teamMemberId"
      AND tm."teamId" = public.get_user_team_id()
      AND (
        tm."userId" = auth.uid()::text OR -- Own profile
        public.get_user_role() = 'COACH'  -- Coach can edit any
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "TeamMember" tm
      WHERE tm.id = "AthleteProfile"."teamMemberId"
      AND tm."teamId" = public.get_user_team_id()
      AND (
        tm."userId" = auth.uid()::text OR
        public.get_user_role() = 'COACH'
      )
    )
  );

-- Only coaches can delete profiles
CREATE POLICY "athlete_profile_delete" ON "AthleteProfile"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "TeamMember" tm
      WHERE tm.id = "AthleteProfile"."teamMemberId"
      AND tm."teamId" = public.get_user_team_id()
    )
    AND public.get_user_role() = 'COACH'
  );

-- =============================================================================
-- Notification Policies
-- =============================================================================

-- Users can only see their own notifications
CREATE POLICY "notification_select" ON "Notification"
  FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- Insert handled via service role (notifications created by server)
-- No direct insert policy for users

-- Users can update (mark as read) their own notifications
CREATE POLICY "notification_update" ON "Notification"
  FOR UPDATE
  TO authenticated
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- Users can delete their own notifications
CREATE POLICY "notification_delete" ON "Notification"
  FOR DELETE
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- =============================================================================
-- TeamSettings Policies
-- =============================================================================

-- Team members can view their team's settings
CREATE POLICY "team_settings_select" ON "TeamSettings"
  FOR SELECT
  TO authenticated
  USING ("teamId" = public.get_user_team_id());

-- Only coaches can insert team settings
CREATE POLICY "team_settings_insert" ON "TeamSettings"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "teamId" = public.get_user_team_id() AND
    public.get_user_role() = 'COACH'
  );

-- Only coaches can update team settings
CREATE POLICY "team_settings_update" ON "TeamSettings"
  FOR UPDATE
  TO authenticated
  USING ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH')
  WITH CHECK ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- Only coaches can delete team settings (unlikely but allowed)
CREATE POLICY "team_settings_delete" ON "TeamSettings"
  FOR DELETE
  TO authenticated
  USING ("teamId" = public.get_user_team_id() AND public.get_user_role() = 'COACH');
