-- Enable RLS on all tables
-- This migration documents that RLS must be enabled on the multi-tenant tables.
-- RLS policies will be created in Plan 03 after the Custom Access Token Hook.

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;

-- Note: Actual policies will be created in Plan 03
-- This file documents that RLS must be enabled
