-- RLS Cross-Tenant Isolation Tests
-- pgTAP test file for verifying Row Level Security policies
--
-- Target: ISOL-03 (Cross-tenant data access blocked at database level)
-- Tables with RLS enabled: Facility, FacilityMembership, Team, TeamMember, Invitation
--
-- NOTE: Equipment has RLS policies but RLS is NOT enabled (critical gap from 26-01 audit)
--
-- Prerequisites:
--   1. pgTAP extension must be installed: CREATE EXTENSION IF NOT EXISTS pgtap;
--   2. supabase-test-helpers for tests.authenticate_as() function
--
-- To check pgTAP availability:
--   SELECT * FROM pg_extension WHERE extname = 'pgtap';
--
-- To run tests (from Supabase SQL Editor):
--   BEGIN;
--   SELECT plan(N);  -- N = total number of tests
--   -- ... test statements ...
--   SELECT * FROM finish();
--   ROLLBACK;

-- =============================================================================
-- EXTENSION CHECK AND TEST SETUP
-- =============================================================================

-- Check if pgTAP is available (run this separately first)
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'pgtap';

-- If pgTAP not installed, install it:
-- CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- =============================================================================
-- TEST HELPERS SETUP
-- =============================================================================

-- Create test schema for isolation
CREATE SCHEMA IF NOT EXISTS tests;

-- Helper to simulate authenticated user with JWT claims
-- This mimics what Supabase's custom access token hook provides
CREATE OR REPLACE FUNCTION tests.authenticate_as(
  p_user_id text,
  p_email text,
  p_team_id text DEFAULT NULL,
  p_club_id text DEFAULT NULL,
  p_facility_id text DEFAULT NULL,
  p_roles text[] DEFAULT ARRAY['ATHLETE']
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_claims jsonb;
BEGIN
  -- Build JWT claims object
  jwt_claims := jsonb_build_object(
    'sub', p_user_id,
    'email', p_email,
    'team_id', COALESCE(p_team_id, ''),
    'club_id', COALESCE(p_club_id, ''),
    'facility_id', COALESCE(p_facility_id, ''),
    'user_roles', to_jsonb(p_roles)
  );

  -- Set the JWT claims in the request context
  PERFORM set_config('request.jwt.claims', jwt_claims::text, true);

  -- Set auth.uid() equivalent
  PERFORM set_config('request.jwt.claim.sub', p_user_id, true);
END;
$$;

-- Helper to clear authentication context
CREATE OR REPLACE FUNCTION tests.clear_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION tests.authenticate_as TO authenticated;
GRANT EXECUTE ON FUNCTION tests.clear_auth TO authenticated;

-- =============================================================================
-- TEST DATA SETUP
-- =============================================================================

-- Create test data for cross-tenant isolation tests
-- Note: UUIDs must match test authentication contexts

-- Test Facilities
-- facility_a: Test Facility A (user_a is admin here)
-- facility_b: Test Facility B (user_b is admin here)

-- Test Teams (within facilities)
-- team_a: belongs to facility_a
-- team_b: belongs to facility_b

-- Test Users
-- user_a: COACH in team_a, member of facility_a
-- user_b: COACH in team_b, member of facility_b
-- user_c: ATHLETE in team_a (should not see team_b data)

-- =============================================================================
-- pgTAP TEST PLAN
-- =============================================================================
-- Uncomment and run in Supabase SQL Editor if pgTAP is installed

/*
BEGIN;

-- Load pgTAP
SELECT * FROM pg_extension WHERE extname = 'pgtap';

-- Plan: 20 tests total (4 tests per table x 5 tables)
SELECT plan(20);

-- =============================================================================
-- TEST 1: Team Table Cross-Tenant Isolation
-- =============================================================================

-- Test 1.1: User A can see their own team
SELECT tests.authenticate_as(
  'user-a-uuid',
  'user-a@example.com',
  'team-a-uuid',
  'club-a-uuid',
  'facility-a-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "Team" WHERE id = 'team-a-uuid'),
  'User A can SELECT their own team'
);

-- Test 1.2: User A CANNOT see Team B
SELECT is(
  (SELECT COUNT(*) FROM "Team" WHERE id = 'team-b-uuid'),
  0::bigint,
  'User A CANNOT SELECT Team B (cross-tenant blocked)'
);

-- Test 1.3: User B can see their own team
SELECT tests.authenticate_as(
  'user-b-uuid',
  'user-b@example.com',
  'team-b-uuid',
  'club-b-uuid',
  'facility-b-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "Team" WHERE id = 'team-b-uuid'),
  'User B can SELECT their own team'
);

-- Test 1.4: User B CANNOT see Team A
SELECT is(
  (SELECT COUNT(*) FROM "Team" WHERE id = 'team-a-uuid'),
  0::bigint,
  'User B CANNOT SELECT Team A (cross-tenant blocked)'
);

-- =============================================================================
-- TEST 2: TeamMember Table Cross-Tenant Isolation
-- =============================================================================

-- Test 2.1: User A can see team members in their team
SELECT tests.authenticate_as(
  'user-a-uuid',
  'user-a@example.com',
  'team-a-uuid',
  'club-a-uuid',
  'facility-a-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "TeamMember" WHERE "teamId"::text = 'team-a-uuid'),
  'User A can SELECT TeamMember records in their team'
);

-- Test 2.2: User A CANNOT see Team B's members
SELECT is(
  (SELECT COUNT(*) FROM "TeamMember" WHERE "teamId"::text = 'team-b-uuid'),
  0::bigint,
  'User A CANNOT SELECT TeamMember records from Team B (cross-tenant blocked)'
);

-- Test 2.3: User B can see team members in their team
SELECT tests.authenticate_as(
  'user-b-uuid',
  'user-b@example.com',
  'team-b-uuid',
  'club-b-uuid',
  'facility-b-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "TeamMember" WHERE "teamId"::text = 'team-b-uuid'),
  'User B can SELECT TeamMember records in their team'
);

-- Test 2.4: User B CANNOT see Team A's members
SELECT is(
  (SELECT COUNT(*) FROM "TeamMember" WHERE "teamId"::text = 'team-a-uuid'),
  0::bigint,
  'User B CANNOT SELECT TeamMember records from Team A (cross-tenant blocked)'
);

-- =============================================================================
-- TEST 3: Facility Table Cross-Tenant Isolation
-- =============================================================================

-- Test 3.1: User A can see their facility
SELECT tests.authenticate_as(
  'user-a-uuid',
  'user-a@example.com',
  'team-a-uuid',
  'club-a-uuid',
  'facility-a-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "Facility" WHERE id = 'facility-a-uuid'),
  'User A can SELECT their own Facility'
);

-- Test 3.2: User A CANNOT see Facility B
SELECT is(
  (SELECT COUNT(*) FROM "Facility" WHERE id = 'facility-b-uuid'),
  0::bigint,
  'User A CANNOT SELECT Facility B (cross-tenant blocked)'
);

-- Test 3.3: User B can see their facility
SELECT tests.authenticate_as(
  'user-b-uuid',
  'user-b@example.com',
  'team-b-uuid',
  'club-b-uuid',
  'facility-b-uuid',
  ARRAY['FACILITY_ADMIN']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "Facility" WHERE id = 'facility-b-uuid'),
  'User B can SELECT their own Facility'
);

-- Test 3.4: User B CANNOT see Facility A
SELECT is(
  (SELECT COUNT(*) FROM "Facility" WHERE id = 'facility-a-uuid'),
  0::bigint,
  'User B CANNOT SELECT Facility A (cross-tenant blocked)'
);

-- =============================================================================
-- TEST 4: FacilityMembership Table Cross-Tenant Isolation
-- =============================================================================

-- Test 4.1: Facility Admin A can see their facility's memberships
SELECT tests.authenticate_as(
  'user-a-uuid',
  'user-a@example.com',
  'team-a-uuid',
  'club-a-uuid',
  'facility-a-uuid',
  ARRAY['FACILITY_ADMIN']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "FacilityMembership" WHERE "facilityId" = 'facility-a-uuid'),
  'Facility Admin A can SELECT their facility memberships'
);

-- Test 4.2: User A CANNOT see Facility B's memberships
SELECT is(
  (SELECT COUNT(*) FROM "FacilityMembership" WHERE "facilityId" = 'facility-b-uuid'),
  0::bigint,
  'User A CANNOT SELECT Facility B memberships (cross-tenant blocked)'
);

-- Test 4.3: User can see their own membership (regardless of facility)
SELECT tests.authenticate_as(
  'user-a-uuid',
  'user-a@example.com',
  'team-a-uuid',
  'club-a-uuid',
  'facility-a-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "FacilityMembership" WHERE "userId" = 'user-a-uuid'),
  'User A can SELECT their own FacilityMembership'
);

-- Test 4.4: User B CANNOT see Facility A's memberships
SELECT tests.authenticate_as(
  'user-b-uuid',
  'user-b@example.com',
  'team-b-uuid',
  'club-b-uuid',
  'facility-b-uuid',
  ARRAY['FACILITY_ADMIN']
);

SELECT is(
  (SELECT COUNT(*) FROM "FacilityMembership" WHERE "facilityId" = 'facility-a-uuid'),
  0::bigint,
  'User B CANNOT SELECT Facility A memberships (cross-tenant blocked)'
);

-- =============================================================================
-- TEST 5: Invitation Table Cross-Tenant Isolation
-- =============================================================================

-- Test 5.1: User A can see their team's invitations
SELECT tests.authenticate_as(
  'user-a-uuid',
  'user-a@example.com',
  'team-a-uuid',
  'club-a-uuid',
  'facility-a-uuid',
  ARRAY['COACH']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "Invitation" WHERE "teamId"::text = 'team-a-uuid'),
  'User A can SELECT Invitation records for their team'
);

-- Test 5.2: User A CANNOT see Team B's invitations
SELECT is(
  (SELECT COUNT(*) FROM "Invitation" WHERE "teamId"::text = 'team-b-uuid'),
  0::bigint,
  'User A CANNOT SELECT Team B Invitations (cross-tenant blocked)'
);

-- Test 5.3: User can see invitation to their email (any team)
SELECT tests.authenticate_as(
  'invited-user-uuid',
  'invited@example.com',
  NULL,
  NULL,
  NULL,
  ARRAY['ATHLETE']
);

SELECT ok(
  EXISTS(SELECT 1 FROM "Invitation" WHERE email = 'invited@example.com'),
  'User can SELECT Invitation addressed to their email'
);

-- Test 5.4: User B CANNOT see Team A's invitations
SELECT tests.authenticate_as(
  'user-b-uuid',
  'user-b@example.com',
  'team-b-uuid',
  'club-b-uuid',
  'facility-b-uuid',
  ARRAY['COACH']
);

SELECT is(
  (SELECT COUNT(*) FROM "Invitation" WHERE "teamId"::text = 'team-a-uuid'),
  0::bigint,
  'User B CANNOT SELECT Team A Invitations (cross-tenant blocked)'
);

-- =============================================================================
-- FINISH TEST PLAN
-- =============================================================================

SELECT * FROM finish();

-- ROLLBACK to avoid creating test data in production
ROLLBACK;
*/

-- =============================================================================
-- MANUAL VERIFICATION QUERIES
-- =============================================================================
-- These can be run in Supabase SQL Editor without pgTAP to verify RLS behavior

-- 1. Verify RLS is enabled on target tables:
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('Facility', 'FacilityMembership', 'Team', 'TeamMember', 'Invitation', 'Equipment')
ORDER BY tablename;

-- 2. List all RLS policies:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('Facility', 'FacilityMembership', 'Team', 'TeamMember', 'Invitation', 'Equipment')
ORDER BY tablename, policyname;

-- 3. Verify helper functions exist:
SELECT
  proname,
  prosrc
FROM pg_proc
WHERE proname IN (
  'get_current_facility_id',
  'get_current_club_id',
  'get_user_team_id',
  'get_user_role',
  'is_facility_admin',
  'is_club_admin_or_higher',
  'is_coach_or_higher',
  'has_role',
  'has_any_role'
)
ORDER BY proname;

-- =============================================================================
-- CROSS-TENANT ISOLATION TEST (Manual Method)
-- =============================================================================
-- Run as authenticated user to verify isolation
--
-- Step 1: Set JWT claims for User A (simulating custom access token hook)
-- SELECT set_config('request.jwt.claims',
--   '{"sub":"user-a-uuid","team_id":"team-a-uuid","facility_id":"facility-a-uuid","user_roles":["COACH"]}'::text,
--   true);
--
-- Step 2: Query Team table - should only see team-a
-- SELECT id, name FROM "Team";
--
-- Step 3: Query TeamMember - should only see team-a members
-- SELECT id, "userId", "teamId", role FROM "TeamMember";
--
-- Step 4: Set JWT claims for User B
-- SELECT set_config('request.jwt.claims',
--   '{"sub":"user-b-uuid","team_id":"team-b-uuid","facility_id":"facility-b-uuid","user_roles":["COACH"]}'::text,
--   true);
--
-- Step 5: Repeat queries - should NOT see team-a data
-- SELECT id, name FROM "Team";
-- SELECT id, "userId", "teamId", role FROM "TeamMember";

-- =============================================================================
-- EXPECTED RESULTS
-- =============================================================================
--
-- With correct RLS configuration:
-- - User A sees only: team-a, team-a members, facility-a, facility-a memberships
-- - User B sees only: team-b, team-b members, facility-b, facility-b memberships
-- - Cross-tenant queries return 0 rows (not errors)
--
-- CRITICAL NOTE: Equipment table has policies but RLS is NOT ENABLED
-- This means Equipment queries will return ALL equipment (isolation failure)
-- FIX: ALTER TABLE "Equipment" ENABLE ROW LEVEL SECURITY;
