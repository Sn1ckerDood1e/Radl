-- RLS Policies for Facility Hierarchy
-- Enables RLS on Facility, FacilityMembership tables
-- Updates Equipment policies for hierarchical ownership
-- Run this in Supabase SQL Editor after previous migrations

-- =============================================================================
-- Enable RLS on New Tables
-- =============================================================================

ALTER TABLE "Facility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FacilityMembership" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Facility Policies
-- =============================================================================

-- Facility members can view their facility
-- Uses JWT claims for facility_id (set by custom_access_token_hook)
CREATE POLICY "facility_select" ON "Facility"
  FOR SELECT
  TO authenticated
  USING (id = public.get_current_facility_id());

-- Facility admins can update their facility
CREATE POLICY "facility_update" ON "Facility"
  FOR UPDATE
  TO authenticated
  USING (
    id = public.get_current_facility_id() AND
    public.is_facility_admin()
  )
  WITH CHECK (
    id = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Facility admins can insert new facilities
-- Note: Initial facility creation typically done via service role
CREATE POLICY "facility_insert" ON "Facility"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_facility_admin());

-- Facility admins can delete their facility
CREATE POLICY "facility_delete" ON "Facility"
  FOR DELETE
  TO authenticated
  USING (
    id = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- =============================================================================
-- FacilityMembership Policies
-- =============================================================================

-- Facility admins can view all memberships for their facility
CREATE POLICY "facility_membership_select" ON "FacilityMembership"
  FOR SELECT
  TO authenticated
  USING (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Users can view their own membership
CREATE POLICY "facility_membership_select_own" ON "FacilityMembership"
  FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- Facility admins can create new memberships
CREATE POLICY "facility_membership_insert" ON "FacilityMembership"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Facility admins can update memberships (e.g., change roles)
CREATE POLICY "facility_membership_update" ON "FacilityMembership"
  FOR UPDATE
  TO authenticated
  USING (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  )
  WITH CHECK (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Facility admins can delete memberships
CREATE POLICY "facility_membership_delete" ON "FacilityMembership"
  FOR DELETE
  TO authenticated
  USING (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- =============================================================================
-- Equipment Policies (Updated for Hierarchical Ownership)
-- =============================================================================

-- Drop existing equipment policies to recreate with hierarchy support
DROP POLICY IF EXISTS "equipment_select" ON "Equipment";
DROP POLICY IF EXISTS "equipment_insert" ON "Equipment";
DROP POLICY IF EXISTS "equipment_update" ON "Equipment";
DROP POLICY IF EXISTS "equipment_delete" ON "Equipment";

-- Equipment SELECT policy with hierarchical visibility
-- - TEAM-owned: visible to team members (teamId matches)
-- - CLUB-owned: visible to club members (clubId matches)
-- - FACILITY-owned: visible to all facility members
-- - Shared CLUB equipment (isShared=true): visible to all facility members
CREATE POLICY "equipment_select_hierarchical" ON "Equipment"
  FOR SELECT
  TO authenticated
  USING (
    -- TEAM-owned: visible to team members (legacy behavior)
    ("ownerType" = 'TEAM' AND "teamId" = public.get_current_club_id())
    OR
    -- CLUB-owned (not shared): visible to club members only
    ("ownerType" = 'CLUB' AND "clubId" = public.get_current_club_id() AND "isShared" = false)
    OR
    -- CLUB-owned (shared): visible to all facility members
    ("ownerType" = 'CLUB' AND "isShared" = true AND "facilityId" = public.get_current_facility_id())
    OR
    -- FACILITY-owned: visible to all facility members
    ("ownerType" = 'FACILITY' AND "facilityId" = public.get_current_facility_id())
  );

-- Equipment INSERT policy
-- - TEAM-owned: coaches of that team
-- - CLUB-owned: club admins
-- - FACILITY-owned: facility admins
CREATE POLICY "equipment_insert_hierarchical" ON "Equipment"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- TEAM-owned: coach of that team
    (
      "ownerType" = 'TEAM' AND
      "teamId" = public.get_current_club_id() AND
      public.is_coach_or_higher()
    )
    OR
    -- CLUB-owned: club admin of that club
    (
      "ownerType" = 'CLUB' AND
      "clubId" = public.get_current_club_id() AND
      public.is_club_admin_or_higher()
    )
    OR
    -- FACILITY-owned: facility admin
    (
      "ownerType" = 'FACILITY' AND
      "facilityId" = public.get_current_facility_id() AND
      public.is_facility_admin()
    )
  );

-- Equipment UPDATE policy
-- - TEAM-owned: coaches of that team can update
-- - CLUB-owned: club admins can update
-- - FACILITY-owned: facility admins can update
CREATE POLICY "equipment_update_hierarchical" ON "Equipment"
  FOR UPDATE
  TO authenticated
  USING (
    -- TEAM-owned: coach of that team
    (
      "ownerType" = 'TEAM' AND
      "teamId" = public.get_current_club_id() AND
      public.is_coach_or_higher()
    )
    OR
    -- CLUB-owned: club admin of that club
    (
      "ownerType" = 'CLUB' AND
      "clubId" = public.get_current_club_id() AND
      public.is_club_admin_or_higher()
    )
    OR
    -- FACILITY-owned: facility admin
    (
      "ownerType" = 'FACILITY' AND
      "facilityId" = public.get_current_facility_id() AND
      public.is_facility_admin()
    )
  )
  WITH CHECK (
    -- Same conditions for USING and WITH CHECK
    (
      "ownerType" = 'TEAM' AND
      "teamId" = public.get_current_club_id() AND
      public.is_coach_or_higher()
    )
    OR
    (
      "ownerType" = 'CLUB' AND
      "clubId" = public.get_current_club_id() AND
      public.is_club_admin_or_higher()
    )
    OR
    (
      "ownerType" = 'FACILITY' AND
      "facilityId" = public.get_current_facility_id() AND
      public.is_facility_admin()
    )
  );

-- Equipment DELETE policy
-- - TEAM-owned: coaches of that team can delete
-- - CLUB-owned: club admins can delete
-- - FACILITY-owned: facility admins can delete
CREATE POLICY "equipment_delete_hierarchical" ON "Equipment"
  FOR DELETE
  TO authenticated
  USING (
    -- TEAM-owned: coach of that team
    (
      "ownerType" = 'TEAM' AND
      "teamId" = public.get_current_club_id() AND
      public.is_coach_or_higher()
    )
    OR
    -- CLUB-owned: club admin of that club
    (
      "ownerType" = 'CLUB' AND
      "clubId" = public.get_current_club_id() AND
      public.is_club_admin_or_higher()
    )
    OR
    -- FACILITY-owned: facility admin
    (
      "ownerType" = 'FACILITY' AND
      "facilityId" = public.get_current_facility_id() AND
      public.is_facility_admin()
    )
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
--   AND tablename IN ('Facility', 'FacilityMembership', 'Equipment');
--
-- Expected output: all three should have rowsecurity = true
--
-- Check policies exist:
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('Facility', 'FacilityMembership', 'Equipment')
-- ORDER BY tablename, policyname;
--
-- Expected policies:
-- - Facility: facility_delete, facility_insert, facility_select, facility_update
-- - FacilityMembership: facility_membership_delete, facility_membership_insert,
--                       facility_membership_select, facility_membership_select_own,
--                       facility_membership_update
-- - Equipment: equipment_delete_hierarchical, equipment_insert_hierarchical,
--              equipment_select_hierarchical, equipment_update_hierarchical
