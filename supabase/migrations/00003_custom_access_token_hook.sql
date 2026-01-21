-- Custom Access Token Hook
-- Injects team_id and user_role into JWT claims
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_team_id uuid;
  user_role text;
BEGIN
  -- Get user's team membership
  SELECT tm.team_id, tm.role INTO user_team_id, user_role
  FROM public."TeamMember" tm
  WHERE tm.user_id = (event->>'user_id')
  LIMIT 1;

  claims := event->'claims';

  IF user_team_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{team_id}', to_jsonb(user_team_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{team_id}', 'null');
    claims := jsonb_set(claims, '{user_role}', 'null');
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to supabase_auth_admin (required for hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- IMPORTANT: After running this SQL, enable the hook in Supabase Dashboard:
-- Authentication -> Hooks -> Add hook -> customAccessTokenHook -> Select this function
