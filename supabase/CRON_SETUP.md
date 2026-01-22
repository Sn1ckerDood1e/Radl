# Race Notifications Cron Setup

The race notification system uses pg_cron to trigger the `process-race-notifications` Edge Function every 5 minutes.

## Setup Steps

### 1. Enable Extensions

In Supabase Dashboard -> Database -> Extensions:
- Enable `pg_cron`
- Enable `pg_net`

### 2. Deploy the Edge Function

```bash
supabase functions deploy process-race-notifications
```

### 3. Create the Cron Job

In Supabase Dashboard -> SQL Editor, run:

```sql
-- Replace YOUR_PROJECT_REF with your project reference (e.g., abcdefghijkl)
SELECT cron.schedule(
  'process-race-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-race-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 4. Verify Setup

Check that the job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-race-notifications';
```

View recent executions:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-race-notifications')
ORDER BY start_time DESC
LIMIT 10;
```

## How It Works

1. **Every 5 minutes**: pg_cron triggers the Edge Function
2. **Edge Function queries**: Finds `NotificationConfig` records where:
   - `notificationSent = false`
   - `scheduledFor` is within the next 5 minutes
3. **For each due notification**:
   - Gets athletes in the entry's lineup
   - Calls `send-notification` Edge Function
   - Marks `notificationSent = true`

## Troubleshooting

### Notifications not sending

1. Check cron job is running: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`
2. Check Edge Function logs in Supabase dashboard
3. Verify `scheduledFor` is set correctly on NotificationConfig records
4. Ensure VAPID keys are configured for push notifications

### Duplicate notifications

The `notificationSent` flag prevents duplicates. If you see duplicates:
1. Check if the flag is being set to `true` after sending
2. Verify there's no race condition in the Edge Function

### Testing

Manually invoke the Edge Function:

```bash
supabase functions invoke process-race-notifications --no-verify-jwt
```
