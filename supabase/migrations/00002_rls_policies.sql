-- RLS Policies for Multi-Tenant Isolation
-- Run this in Supabase SQL Editor

-- Helper function to get current user's team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT team_id::uuid
  FROM public."TeamMember"
  WHERE user_id = auth.uid()::text
  LIMIT 1
$$;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public."TeamMember"
  WHERE user_id = auth.uid()::text
  LIMIT 1
$$;

-- Team policies
-- Note: RLS is already enabled on tables (from 00001_enable_rls.sql)

CREATE POLICY "Users can view own team"
ON "Team" FOR SELECT
TO authenticated
USING (id = public.get_user_team_id());

CREATE POLICY "Coaches can update own team"
ON "Team" FOR UPDATE
TO authenticated
USING (id = public.get_user_team_id() AND public.get_user_role() = 'COACH')
WITH CHECK (id = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- TeamMember policies
CREATE POLICY "Users can view own team members"
ON "TeamMember" FOR SELECT
TO authenticated
USING (team_id = public.get_user_team_id());

CREATE POLICY "Coaches can insert team members"
ON "TeamMember" FOR INSERT
TO authenticated
WITH CHECK (team_id = public.get_user_team_id() AND public.get_user_role() = 'COACH');

CREATE POLICY "Coaches can update team members"
ON "TeamMember" FOR UPDATE
TO authenticated
USING (team_id = public.get_user_team_id() AND public.get_user_role() = 'COACH');

CREATE POLICY "Coaches can delete team members"
ON "TeamMember" FOR DELETE
TO authenticated
USING (team_id = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- Invitation policies
CREATE POLICY "Users can view own team invitations"
ON "Invitation" FOR SELECT
TO authenticated
USING (team_id = public.get_user_team_id());

CREATE POLICY "Coaches can insert invitations"
ON "Invitation" FOR INSERT
TO authenticated
WITH CHECK (team_id = public.get_user_team_id() AND public.get_user_role() = 'COACH');

CREATE POLICY "Coaches can update invitations"
ON "Invitation" FOR UPDATE
TO authenticated
USING (team_id = public.get_user_team_id() AND public.get_user_role() = 'COACH');

-- Public can view invitations by email (for accepting)
CREATE POLICY "Anyone can view invitation by email"
ON "Invitation" FOR SELECT
TO authenticated
USING (email = auth.email());

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_team_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
