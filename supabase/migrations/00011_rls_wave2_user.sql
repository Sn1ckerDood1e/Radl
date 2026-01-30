-- RLS Wave 2: User Scoping (4 Tables)
-- Tables scoped to individual users or facility admins
-- Run this in Supabase SQL Editor after Wave 1 migration

-- =============================================================================
-- Enable RLS on Wave 2 Tables
-- =============================================================================

ALTER TABLE "MfaBackupCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnnouncementRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SsoConfig" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- MfaBackupCode Policies
-- Users can only access their own backup codes
-- =============================================================================

-- Users can view their own backup codes
CREATE POLICY "mfa_backup_code_select" ON "MfaBackupCode"
  FOR SELECT TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

-- Users can insert their own backup codes
CREATE POLICY "mfa_backup_code_insert" ON "MfaBackupCode"
  FOR INSERT TO authenticated
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- Users can update their own backup codes (mark as used)
CREATE POLICY "mfa_backup_code_update" ON "MfaBackupCode"
  FOR UPDATE TO authenticated
  USING ("userId" = (SELECT auth.uid())::text)
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- Users can delete their own backup codes
CREATE POLICY "mfa_backup_code_delete" ON "MfaBackupCode"
  FOR DELETE TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

-- =============================================================================
-- PushSubscription Policies
-- Users can only access their own push subscriptions
-- =============================================================================

-- Users can view their own push subscriptions
CREATE POLICY "push_subscription_select" ON "PushSubscription"
  FOR SELECT TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

-- Users can insert their own push subscriptions
CREATE POLICY "push_subscription_insert" ON "PushSubscription"
  FOR INSERT TO authenticated
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- Users can update their own push subscriptions
CREATE POLICY "push_subscription_update" ON "PushSubscription"
  FOR UPDATE TO authenticated
  USING ("userId" = (SELECT auth.uid())::text)
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- Users can delete their own push subscriptions
CREATE POLICY "push_subscription_delete" ON "PushSubscription"
  FOR DELETE TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

-- =============================================================================
-- AnnouncementRead Policies
-- Users can only access their own read receipts
-- =============================================================================

-- Users can view their own read receipts
CREATE POLICY "announcement_read_select" ON "AnnouncementRead"
  FOR SELECT TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

-- Users can insert their own read receipts
CREATE POLICY "announcement_read_insert" ON "AnnouncementRead"
  FOR INSERT TO authenticated
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- Users can update their own read receipts (unlikely but allowed)
CREATE POLICY "announcement_read_update" ON "AnnouncementRead"
  FOR UPDATE TO authenticated
  USING ("userId" = (SELECT auth.uid())::text)
  WITH CHECK ("userId" = (SELECT auth.uid())::text);

-- Users can delete their own read receipts
CREATE POLICY "announcement_read_delete" ON "AnnouncementRead"
  FOR DELETE TO authenticated
  USING ("userId" = (SELECT auth.uid())::text);

-- =============================================================================
-- SsoConfig Policies
-- Only facility admins can access SSO configuration
-- =============================================================================

-- Facility admins can view SSO config for their facility
CREATE POLICY "sso_config_select" ON "SsoConfig"
  FOR SELECT TO authenticated
  USING (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Facility admins can insert SSO config for their facility
CREATE POLICY "sso_config_insert" ON "SsoConfig"
  FOR INSERT TO authenticated
  WITH CHECK (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Facility admins can update SSO config for their facility
CREATE POLICY "sso_config_update" ON "SsoConfig"
  FOR UPDATE TO authenticated
  USING (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  )
  WITH CHECK (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
  );

-- Facility admins can delete SSO config for their facility
CREATE POLICY "sso_config_delete" ON "SsoConfig"
  FOR DELETE TO authenticated
  USING (
    "facilityId" = public.get_current_facility_id() AND
    public.is_facility_admin()
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
--   AND tablename IN ('MfaBackupCode', 'PushSubscription', 'AnnouncementRead', 'SsoConfig');
--
-- Check policies exist:
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('MfaBackupCode', 'PushSubscription', 'AnnouncementRead', 'SsoConfig')
-- ORDER BY tablename, policyname;

-- =============================================================================
-- Rollback (if needed)
-- =============================================================================
-- DROP POLICY IF EXISTS "mfa_backup_code_select" ON "MfaBackupCode";
-- DROP POLICY IF EXISTS "mfa_backup_code_insert" ON "MfaBackupCode";
-- DROP POLICY IF EXISTS "mfa_backup_code_update" ON "MfaBackupCode";
-- DROP POLICY IF EXISTS "mfa_backup_code_delete" ON "MfaBackupCode";
-- ALTER TABLE "MfaBackupCode" DISABLE ROW LEVEL SECURITY;
-- (repeat for all tables)
