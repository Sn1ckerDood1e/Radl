-- RLS Performance Fixes
-- Addresses Supabase performance advisor warnings:
-- 1. auth_rls_initplan: Wrap auth.<function>() in (select ...) to prevent row-by-row re-evaluation
-- 2. multiple_permissive_policies: Combine multiple SELECT policies into single policy with OR
-- Run this in Supabase SQL Editor after previous migrations

-- =============================================================================
-- Fix Invitation Policies
-- Issues:
-- - "Anyone can view invitation by email" uses auth.email() without select wrapper
-- - Multiple permissive SELECT policies for same role/action
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own team invitations" ON "Invitation";
DROP POLICY IF EXISTS "Anyone can view invitation by email" ON "Invitation";

-- Create combined SELECT policy with proper auth function wrapping
-- Users can view invitations for their team OR invitations sent to their email
CREATE POLICY "invitation_select" ON "Invitation"
  FOR SELECT
  TO authenticated
  USING (
    "teamId" = public.get_user_team_id()
    OR
    email = (SELECT auth.email())
  );

-- =============================================================================
-- Fix FacilityMembership Policies
-- Issues:
-- - "facility_membership_select_own" uses auth.uid() without select wrapper
-- - Multiple permissive SELECT policies for same role/action
-- =============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "facility_membership_select" ON "FacilityMembership";
DROP POLICY IF EXISTS "facility_membership_select_own" ON "FacilityMembership";

-- Create combined SELECT policy with proper auth function wrapping
-- Users can view their own membership OR facility admins can view all memberships
CREATE POLICY "facility_membership_select" ON "FacilityMembership"
  FOR SELECT
  TO authenticated
  USING (
    "userId" = (SELECT auth.uid())::text
    OR
    (
      "facilityId" = public.get_current_facility_id() AND
      public.is_facility_admin()
    )
  );

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these after applying to verify policies are fixed:
--
-- Check Invitation policies (should have single SELECT policy):
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'Invitation';
--
-- Check FacilityMembership policies (should have single SELECT policy):
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'FacilityMembership';
--
-- Re-run Supabase performance advisor to confirm warnings are resolved

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- To revert to original policies:
--
-- DROP POLICY IF EXISTS "invitation_select" ON "Invitation";
-- CREATE POLICY "Users can view own team invitations" ON "Invitation"
--   FOR SELECT TO authenticated
--   USING (team_id = public.get_user_team_id());
-- CREATE POLICY "Anyone can view invitation by email" ON "Invitation"
--   FOR SELECT TO authenticated
--   USING (email = auth.email());
--
-- DROP POLICY IF EXISTS "facility_membership_select" ON "FacilityMembership";
-- CREATE POLICY "facility_membership_select" ON "FacilityMembership"
--   FOR SELECT TO authenticated
--   USING ("facilityId" = public.get_current_facility_id() AND public.is_facility_admin());
-- CREATE POLICY "facility_membership_select_own" ON "FacilityMembership"
--   FOR SELECT TO authenticated
--   USING ("userId" = auth.uid()::text);
