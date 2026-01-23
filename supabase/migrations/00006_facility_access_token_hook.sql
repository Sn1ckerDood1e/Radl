-- Updated Custom Access Token Hook for Facility Hierarchy
-- Injects facility_id, club_id, team_id, and user_roles into JWT claims
-- Run this in Supabase SQL Editor

-- =============================================================================
-- Updated Custom Access Token Hook
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
BEGIN
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
-- Permissions (re-grant after function replacement)
-- =============================================================================

-- Grant execute to supabase_auth_admin (required for hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =============================================================================
-- Documentation
-- =============================================================================
--
-- This hook is called by Supabase Auth when generating access tokens.
-- It injects custom claims that are used by RLS policies.
--
-- Claims added:
--   facility_id: UUID of user's facility (null if none)
--   club_id: UUID of user's current club (null if none)
--   team_id: Same as club_id (backward compatibility)
--   user_roles: Array of roles in current club (e.g., ['COACH', 'ATHLETE'])
--   user_role: First role (backward compatibility)
--
-- Note: The hook reads from ClubMembership first, falling back to TeamMember.
-- This provides backward compatibility during migration.
--
-- IMPORTANT: After running this SQL, verify the hook is enabled:
-- Authentication -> Hooks -> customAccessTokenHook should point to this function
