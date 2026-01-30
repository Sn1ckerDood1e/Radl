-- RLS Wave 1: Direct Scoping (12 Tables)
-- Tables with teamId/clubId columns - use simple JWT comparison
-- Run this in Supabase SQL Editor after previous migrations

-- =============================================================================
-- Enable RLS on Wave 1 Tables
-- =============================================================================

ALTER TABLE "Practice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Season" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Regatta" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlockTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LineupTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissionGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegattaCentralConnection" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Practice Policies
-- =============================================================================

-- All team members can view practices
CREATE POLICY "practice_select" ON "Practice"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert practices
CREATE POLICY "practice_insert" ON "Practice"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update practices
CREATE POLICY "practice_update" ON "Practice"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete practices
CREATE POLICY "practice_delete" ON "Practice"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- Season Policies
-- =============================================================================

-- All team members can view seasons
CREATE POLICY "season_select" ON "Season"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert seasons
CREATE POLICY "season_insert" ON "Season"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update seasons
CREATE POLICY "season_update" ON "Season"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete seasons
CREATE POLICY "season_delete" ON "Season"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- Regatta Policies
-- =============================================================================

-- All team members can view regattas
CREATE POLICY "regatta_select" ON "Regatta"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert regattas
CREATE POLICY "regatta_insert" ON "Regatta"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update regattas
CREATE POLICY "regatta_update" ON "Regatta"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete regattas
CREATE POLICY "regatta_delete" ON "Regatta"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- PracticeTemplate Policies
-- =============================================================================

-- All team members can view practice templates
CREATE POLICY "practice_template_select" ON "PracticeTemplate"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert practice templates
CREATE POLICY "practice_template_insert" ON "PracticeTemplate"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update practice templates
CREATE POLICY "practice_template_update" ON "PracticeTemplate"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete practice templates
CREATE POLICY "practice_template_delete" ON "PracticeTemplate"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- BlockTemplate Policies
-- =============================================================================

-- All team members can view block templates
CREATE POLICY "block_template_select" ON "BlockTemplate"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert block templates
CREATE POLICY "block_template_insert" ON "BlockTemplate"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update block templates
CREATE POLICY "block_template_update" ON "BlockTemplate"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete block templates
CREATE POLICY "block_template_delete" ON "BlockTemplate"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- WorkoutTemplate Policies
-- =============================================================================

-- All team members can view workout templates
CREATE POLICY "workout_template_select" ON "WorkoutTemplate"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert workout templates
CREATE POLICY "workout_template_insert" ON "WorkoutTemplate"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update workout templates
CREATE POLICY "workout_template_update" ON "WorkoutTemplate"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete workout templates
CREATE POLICY "workout_template_delete" ON "WorkoutTemplate"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- LineupTemplate Policies
-- =============================================================================

-- All team members can view lineup templates
CREATE POLICY "lineup_template_select" ON "LineupTemplate"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert lineup templates
CREATE POLICY "lineup_template_insert" ON "LineupTemplate"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update lineup templates
CREATE POLICY "lineup_template_update" ON "LineupTemplate"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete lineup templates
CREATE POLICY "lineup_template_delete" ON "LineupTemplate"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- Announcement Policies
-- =============================================================================

-- All team members can view announcements
CREATE POLICY "announcement_select" ON "Announcement"
  FOR SELECT TO authenticated
  USING ("teamId" = public.get_current_club_id());

-- Coaches and above can insert announcements
CREATE POLICY "announcement_insert" ON "Announcement"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update announcements
CREATE POLICY "announcement_update" ON "Announcement"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete announcements
CREATE POLICY "announcement_delete" ON "Announcement"
  FOR DELETE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- =============================================================================
-- ClubMembership Policies
-- =============================================================================

-- Users can view their own membership OR club admins can view all memberships
CREATE POLICY "club_membership_select" ON "ClubMembership"
  FOR SELECT TO authenticated
  USING (
    "userId" = (SELECT auth.uid())::text
    OR
    (
      "clubId" = public.get_current_club_id() AND
      public.is_club_admin_or_higher()
    )
  );

-- Club admins can insert new memberships
CREATE POLICY "club_membership_insert" ON "ClubMembership"
  FOR INSERT TO authenticated
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can update memberships
CREATE POLICY "club_membership_update" ON "ClubMembership"
  FOR UPDATE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  )
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can delete memberships
CREATE POLICY "club_membership_delete" ON "ClubMembership"
  FOR DELETE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- =============================================================================
-- ApiKey Policies
-- =============================================================================

-- Club admins can view API keys for their club
CREATE POLICY "api_key_select" ON "ApiKey"
  FOR SELECT TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can insert API keys
CREATE POLICY "api_key_insert" ON "ApiKey"
  FOR INSERT TO authenticated
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can update API keys (e.g., revoke)
CREATE POLICY "api_key_update" ON "ApiKey"
  FOR UPDATE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  )
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can delete API keys
CREATE POLICY "api_key_delete" ON "ApiKey"
  FOR DELETE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- =============================================================================
-- PermissionGrant Policies
-- =============================================================================

-- Users can view their own permission grants OR club admins can view all
CREATE POLICY "permission_grant_select" ON "PermissionGrant"
  FOR SELECT TO authenticated
  USING (
    "userId" = (SELECT auth.uid())::text
    OR
    (
      "clubId" = public.get_current_club_id() AND
      public.is_club_admin_or_higher()
    )
  );

-- Club admins can insert permission grants
CREATE POLICY "permission_grant_insert" ON "PermissionGrant"
  FOR INSERT TO authenticated
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can update permission grants (e.g., revoke)
CREATE POLICY "permission_grant_update" ON "PermissionGrant"
  FOR UPDATE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  )
  WITH CHECK (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- Club admins can delete permission grants
CREATE POLICY "permission_grant_delete" ON "PermissionGrant"
  FOR DELETE TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    public.is_club_admin_or_higher()
  );

-- =============================================================================
-- RegattaCentralConnection Policies
-- =============================================================================

-- Coaches and above can view RC connection for their team
CREATE POLICY "rc_connection_select" ON "RegattaCentralConnection"
  FOR SELECT TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can insert RC connection
CREATE POLICY "rc_connection_insert" ON "RegattaCentralConnection"
  FOR INSERT TO authenticated
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can update RC connection
CREATE POLICY "rc_connection_update" ON "RegattaCentralConnection"
  FOR UPDATE TO authenticated
  USING (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  )
  WITH CHECK (
    "teamId" = public.get_current_club_id() AND
    public.is_coach_or_higher()
  );

-- Coaches and above can delete RC connection
CREATE POLICY "rc_connection_delete" ON "RegattaCentralConnection"
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
--   AND tablename IN (
--     'Practice', 'Season', 'Regatta', 'PracticeTemplate',
--     'BlockTemplate', 'WorkoutTemplate', 'LineupTemplate', 'Announcement',
--     'ClubMembership', 'ApiKey', 'PermissionGrant', 'RegattaCentralConnection'
--   );
--
-- Check policies exist:
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'Practice', 'Season', 'Regatta', 'PracticeTemplate',
--     'BlockTemplate', 'WorkoutTemplate', 'LineupTemplate', 'Announcement',
--     'ClubMembership', 'ApiKey', 'PermissionGrant', 'RegattaCentralConnection'
--   )
-- ORDER BY tablename, policyname;

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- DROP POLICY IF EXISTS "practice_select" ON "Practice";
-- DROP POLICY IF EXISTS "practice_insert" ON "Practice";
-- DROP POLICY IF EXISTS "practice_update" ON "Practice";
-- DROP POLICY IF EXISTS "practice_delete" ON "Practice";
-- ALTER TABLE "Practice" DISABLE ROW LEVEL SECURITY;
-- (repeat for all tables)
