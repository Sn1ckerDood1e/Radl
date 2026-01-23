-- RLS Helper Functions for Facility Hierarchy
-- Extracts tenant context from JWT claims (connection-pooling safe)
-- Run this in Supabase SQL Editor after Prisma migration

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Get facility_id from JWT claims
-- Returns NULL if not set (user not in any facility)
CREATE OR REPLACE FUNCTION public.get_current_facility_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'facility_id'),
    ''
  )::uuid
$$;

-- Get club_id from JWT claims
-- Returns NULL if not set (user not in any club)
CREATE OR REPLACE FUNCTION public.get_current_club_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'club_id'),
    ''
  )::uuid
$$;

-- Get team_id from JWT claims (backward compatibility alias)
-- Returns club_id value (team = club in current schema)
CREATE OR REPLACE FUNCTION public.get_current_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_current_club_id()
$$;

-- Check if current user has a specific role in their current context
-- Reads from user_roles array in JWT claims
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    required_role = ANY(
      ARRAY(
        SELECT jsonb_array_elements_text(
          COALESCE(
            current_setting('request.jwt.claims', true)::jsonb -> 'user_roles',
            '[]'::jsonb
          )
        )
      )
    ),
    false
  )
$$;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(required_roles) AS r(role)
    WHERE public.has_role(r.role)
  )
$$;

-- Check if user is facility admin (convenience function)
CREATE OR REPLACE FUNCTION public.is_facility_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role('FACILITY_ADMIN')
$$;

-- Check if user is club admin or higher
CREATE OR REPLACE FUNCTION public.is_club_admin_or_higher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_any_role(ARRAY['FACILITY_ADMIN', 'CLUB_ADMIN'])
$$;

-- Check if user is coach or higher
CREATE OR REPLACE FUNCTION public.is_coach_or_higher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_any_role(ARRAY['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH'])
$$;

-- =============================================================================
-- Grant Permissions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_current_facility_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_club_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_team_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facility_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_admin_or_higher TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_or_higher TO authenticated;

-- =============================================================================
-- Documentation
-- =============================================================================
--
-- Usage in RLS policies:
--
-- -- Facility-owned equipment visible to facility members
-- "facilityId" = (SELECT public.get_current_facility_id())
--
-- -- Club-owned equipment visible to club members
-- "clubId" = (SELECT public.get_current_club_id())
--
-- -- Only facility admins can modify
-- public.is_facility_admin()
--
-- -- Coaches and above can edit
-- public.is_coach_or_higher()
--
-- NOTE: These functions read from JWT claims, which are set by the
-- custom_access_token_hook. JWT claims are immutable per request and
-- safe for use with connection pooling (Supavisor transaction mode).
