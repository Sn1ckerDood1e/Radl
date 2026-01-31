-- Super Admin Infrastructure
-- Creates SuperAdmin table and updates access token hook to include is_super_admin claim
-- Run this in Supabase SQL Editor

-- =============================================================================
-- 1. Create SuperAdmin Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public."SuperAdmin" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT UNIQUE NOT NULL,  -- Supabase auth.users ID
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdBy" TEXT  -- userId who granted super admin (null for first admin)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS "SuperAdmin_userId_idx" ON public."SuperAdmin" ("userId");

-- =============================================================================
-- 2. Enable RLS on SuperAdmin Table
-- =============================================================================

ALTER TABLE public."SuperAdmin" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. RLS Policies for SuperAdmin Table
-- =============================================================================

-- Policy: Only super admins can read SuperAdmin table
-- This prevents regular users from discovering who is a super admin
CREATE POLICY "SuperAdmin_select_policy"
ON public."SuperAdmin"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public."SuperAdmin" sa
    WHERE sa."userId" = auth.uid()::text
  )
);

-- Policy: No direct inserts via RLS (use seed script or direct SQL)
-- Super admins are created via database scripts, not API
CREATE POLICY "SuperAdmin_insert_policy"
ON public."SuperAdmin"
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Policy: No updates via RLS
CREATE POLICY "SuperAdmin_update_policy"
ON public."SuperAdmin"
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Policy: No deletes via RLS
CREATE POLICY "SuperAdmin_delete_policy"
ON public."SuperAdmin"
FOR DELETE
TO authenticated
USING (false);

-- =============================================================================
-- 4. Update Custom Access Token Hook to Include is_super_admin Claim
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_facility_id uuid;
  user_club_id uuid;
  user_roles text[];
  legacy_role text;
  is_super boolean;
BEGIN
  -- Check if user is a super admin (evaluated first for fast path)
  SELECT EXISTS (
    SELECT 1 FROM public."SuperAdmin"
    WHERE "userId" = (event->>'user_id')
  ) INTO is_super;

  -- Get user's current context from ClubMembership + Team (Club) -> Facility
  -- Uses first active membership found (user can switch clubs via cookie)
  SELECT
    t."facilityId",
    cm."clubId",
    cm.roles
  INTO user_facility_id, user_club_id, user_roles
  FROM public."ClubMembership" cm
  JOIN public."Team" t ON t.id = cm."clubId"
  WHERE cm."userId" = (event->>'user_id')
    AND cm."isActive" = true
  LIMIT 1;

  -- If no ClubMembership, try legacy TeamMember
  IF user_club_id IS NULL THEN
    SELECT tm."teamId", t."facilityId", ARRAY[tm.role::text]
    INTO user_club_id, user_facility_id, user_roles
    FROM public."TeamMember" tm
    JOIN public."Team" t ON t.id = tm."teamId"
    WHERE tm."userId" = (event->>'user_id')
    LIMIT 1;
  END IF;

  claims := event->'claims';

  -- Add is_super_admin claim (first claim for visibility)
  claims := jsonb_set(claims, '{is_super_admin}', to_jsonb(is_super));

  -- Add facility_id claim
  IF user_facility_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{facility_id}', to_jsonb(user_facility_id::text));
  ELSE
    claims := jsonb_set(claims, '{facility_id}', 'null');
  END IF;

  -- Add club_id claim
  IF user_club_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{club_id}', to_jsonb(user_club_id::text));
    -- Legacy: team_id = club_id for backward compatibility
    claims := jsonb_set(claims, '{team_id}', to_jsonb(user_club_id::text));
  ELSE
    claims := jsonb_set(claims, '{club_id}', 'null');
    claims := jsonb_set(claims, '{team_id}', 'null');
  END IF;

  -- Add user_roles claim (array)
  IF user_roles IS NOT NULL AND array_length(user_roles, 1) > 0 THEN
    claims := jsonb_set(claims, '{user_roles}', to_jsonb(user_roles));
    -- Legacy: user_role = first role for backward compatibility
    legacy_role := user_roles[1];
    claims := jsonb_set(claims, '{user_role}', to_jsonb(legacy_role));
  ELSE
    claims := jsonb_set(claims, '{user_roles}', '[]'::jsonb);
    claims := jsonb_set(claims, '{user_role}', 'null');
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- =============================================================================
-- 5. Permissions (re-grant after function replacement)
-- =============================================================================

-- Grant execute to supabase_auth_admin (required for hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =============================================================================
-- Documentation
-- =============================================================================
--
-- This migration:
--   1. Creates the SuperAdmin table for platform-level admin tracking
--   2. Enables RLS with policies that only allow super admins to read the table
--   3. Updates the custom_access_token_hook to include is_super_admin boolean claim
--
-- Claims added to JWT:
--   is_super_admin: Boolean indicating platform-level super admin status
--
-- Security notes:
--   - SuperAdmin records cannot be created/updated/deleted via API (RLS blocked)
--   - Use seed script or direct SQL to manage super admins
--   - The SuperAdmin table is only readable by existing super admins
--
-- Usage:
--   1. Run this migration in Supabase SQL Editor
--   2. Use seed-super-admin.ts to create first super admin
--   3. Middleware can check jwt.is_super_admin for fast auth checks
--
