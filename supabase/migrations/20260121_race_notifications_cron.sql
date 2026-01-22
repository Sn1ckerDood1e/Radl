-- Enable pg_cron extension (if not already enabled)
-- Note: This must be run by a superuser or via Supabase dashboard
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP calls (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the race notification processor to run every 5 minutes
-- This calls the process-race-notifications Edge Function
--
-- To set up:
-- 1. Enable pg_cron and pg_net extensions in Supabase dashboard
-- 2. Run this SQL in the SQL editor with proper credentials
--
-- Note: Replace <your-project-ref> with your Supabase project reference
-- The service role key should be set via Supabase secrets, not hardcoded

/*
SELECT cron.schedule(
  'process-race-notifications',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/process-race-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
*/

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule:
-- SELECT cron.unschedule('process-race-notifications');

-- Alternative: Use Supabase scheduled Edge Function (if available)
-- This can be configured in supabase/config.toml:
--
-- [functions.process-race-notifications]
-- schedule = "*/5 * * * *"
