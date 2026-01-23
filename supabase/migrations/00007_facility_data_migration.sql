-- Data Migration: Create Facility wrappers for existing Teams
-- Migrates existing data to facility hierarchy model
-- Run this in Supabase SQL Editor after schema migration

-- =============================================================================
-- OVERVIEW
-- =============================================================================
-- This migration performs three operations:
-- 1. Creates a Facility wrapper for each existing Team (same name)
-- 2. Links each Team to its Facility via facilityId
-- 3. Sets Equipment ownership to TEAM with clubId = teamId
--
-- After this migration:
-- - Every Team has a Facility with the same name
-- - Every Equipment has ownerType = TEAM and clubId = teamId
-- - RLS policies and JWT claims work with existing data

-- =============================================================================
-- STEP 1: Create Facility wrapper for each existing Team
-- =============================================================================
-- For each Team without a Facility, create a Facility with the same name
-- Uses Team slug with '-facility' suffix to ensure uniqueness

INSERT INTO public."Facility" (id, name, slug, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  t.name,
  t.slug || '-facility',
  NOW(),
  NOW()
FROM public."Team" t
WHERE t."facilityId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."Facility" f
    WHERE f.slug = t.slug || '-facility'
  );

-- =============================================================================
-- STEP 2: Link Teams to their Facilities
-- =============================================================================
-- Update each Team's facilityId to point to its corresponding Facility
-- Matches by slug pattern (team.slug + '-facility' = facility.slug)

UPDATE public."Team" t
SET "facilityId" = f.id
FROM public."Facility" f
WHERE f.slug = t.slug || '-facility'
  AND t."facilityId" IS NULL;

-- =============================================================================
-- STEP 3: Migrate Equipment to TEAM ownership
-- =============================================================================
-- Existing equipment belongs to teams, so:
-- - Set ownerType to TEAM (backward compat value)
-- - Set clubId to teamId (team = club in current model)
-- Only update equipment that hasn't been migrated yet

UPDATE public."Equipment" e
SET
  "ownerType" = 'TEAM',
  "clubId" = e."teamId"
WHERE e."teamId" IS NOT NULL
  AND e."ownerType" = 'TEAM'
  AND e."clubId" IS NULL;

-- =============================================================================
-- STEP 4: Verification
-- =============================================================================
-- Verify all data was migrated correctly
-- RAISE EXCEPTION if any Teams lack Facilities or Equipment lacks ownership

DO $$
DECLARE
  orphan_teams integer;
  orphan_equipment integer;
BEGIN
  -- Check for Teams without facilityId
  SELECT COUNT(*) INTO orphan_teams
  FROM public."Team"
  WHERE "facilityId" IS NULL;

  IF orphan_teams > 0 THEN
    RAISE EXCEPTION 'DATA MIGRATION FAILED: % Teams still have NULL facilityId', orphan_teams;
  END IF;

  -- Check for Equipment with teamId but missing clubId
  SELECT COUNT(*) INTO orphan_equipment
  FROM public."Equipment"
  WHERE "teamId" IS NOT NULL
    AND "clubId" IS NULL;

  IF orphan_equipment > 0 THEN
    RAISE EXCEPTION 'DATA MIGRATION FAILED: % Equipment records still have NULL clubId', orphan_equipment;
  END IF;

  RAISE NOTICE 'DATA MIGRATION SUCCESSFUL: All Teams have Facilities, all Equipment has ownership set';
END $$;

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
-- To rollback this migration, run:
--
-- -- Remove Equipment ownership
-- UPDATE public."Equipment" SET "clubId" = NULL WHERE "ownerType" = 'TEAM';
--
-- -- Unlink Teams from Facilities
-- UPDATE public."Team" SET "facilityId" = NULL;
--
-- -- Delete auto-generated Facilities (by slug pattern)
-- DELETE FROM public."Facility" WHERE slug LIKE '%-facility';

-- =============================================================================
-- POST-MIGRATION NOTES
-- =============================================================================
--
-- After running this migration:
--
-- 1. Verify the data:
--    SELECT COUNT(*) FROM "Team" WHERE "facilityId" IS NULL;  -- Should be 0
--    SELECT COUNT(*) FROM "Equipment" WHERE "teamId" IS NOT NULL AND "clubId" IS NULL;  -- Should be 0
--
-- 2. The JWT hook (00006) will now include facility_id in claims
--
-- 3. RLS policies can use get_current_facility_id() for Facility-level access
--
-- 4. For true multi-club facilities later:
--    - Update Facility records with proper names (not "{team-name}")
--    - Add FacilityMembership records for FACILITY_ADMIN users
--    - Add multiple Teams to a single Facility
