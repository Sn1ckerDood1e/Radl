-- Phase 27: AuditLog Immutability
-- Ensures audit logs cannot be modified or deleted after creation

-- Enable RLS on AuditLog table
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- INSERT policy: Allow inserts from authenticated users
-- Note: Prisma uses service role which bypasses RLS, but this is defense-in-depth
CREATE POLICY "audit_log_insert" ON "AuditLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT policy: Only admins can view audit logs, scoped by club
CREATE POLICY "audit_log_select_admin" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING (
    "clubId" = public.get_current_club_id() AND
    (public.is_club_admin_or_higher() OR public.is_facility_admin())
  );

-- Self-view policy: Users can view their own actions
CREATE POLICY "audit_log_select_own" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid()::text);

-- NO UPDATE policy = updates blocked by RLS
-- NO DELETE policy = deletes blocked by RLS

-- Trigger as defense-in-depth (catches service role modifications)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Create trigger BEFORE UPDATE OR DELETE
CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- Add documentation comment
COMMENT ON TABLE "AuditLog" IS 'Immutable audit log. Retention: 365 days. RLS enabled.';
