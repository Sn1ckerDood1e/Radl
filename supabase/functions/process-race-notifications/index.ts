// Supabase Edge Function for processing scheduled race notifications
// Triggered by pg_cron every 5 minutes
//
// This function:
// 1. Finds NotificationConfig records due in the next 5 minutes
// 2. Gets athletes in the entry's lineup
// 3. Sends push notification via send-notification function
// 4. Marks notifications as sent

// @ts-expect-error Deno imports not recognized by TypeScript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error Deno imports not recognized by TypeScript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationWithEntry {
  id: string;
  entryId: string;
  leadTimeMinutes: number;
  entry: {
    eventName: string;
    scheduledTime: string;
    meetingLocation: string | null;
    regatta: {
      id: string;
      name: string;
      teamId: string;
      timezone: string | null;
    };
  };
}

interface EntrySeat {
  athlete: {
    teamMember: {
      userId: string;
    };
  };
}

serve(async (req: Request) => {
  try {
    // Only allow POST requests (from cron or direct invocation)
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find notifications due in the next 5 minutes
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const { data: dueNotifications, error: fetchError } = await supabase
      .from('NotificationConfig')
      .select(`
        id,
        entryId,
        leadTimeMinutes,
        entry:Entry(
          eventName,
          scheduledTime,
          meetingLocation,
          regatta:Regatta(
            id,
            name,
            teamId,
            timezone
          )
        )
      `)
      .eq('notificationSent', false)
      .not('scheduledFor', 'is', null)
      .lte('scheduledFor', fiveMinutesFromNow.toISOString())
      .gte('scheduledFor', now.toISOString());

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No notifications due' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${dueNotifications.length} race notifications`);

    let successCount = 0;
    let failCount = 0;

    // Process each notification
    for (const notification of dueNotifications as unknown as NotificationWithEntry[]) {
      try {
        const entry = notification.entry;
        const regatta = entry.regatta;

        // Get athletes in the lineup for this entry
        const { data: lineup } = await supabase
          .from('EntryLineup')
          .select(`
            seats:EntrySeat(
              athlete:AthleteProfile(
                teamMember:TeamMember(
                  userId
                )
              )
            )
          `)
          .eq('entryId', notification.entryId)
          .single();

        if (!lineup || !lineup.seats || lineup.seats.length === 0) {
          console.log(`No lineup for entry ${notification.entryId}, skipping notification`);
          // Mark as sent to prevent reprocessing
          await supabase
            .from('NotificationConfig')
            .update({ notificationSent: true, sentAt: new Date().toISOString() })
            .eq('id', notification.id);
          continue;
        }

        // Extract user IDs from lineup
        const userIds = (lineup.seats as EntrySeat[])
          .map((s) => s.athlete?.teamMember?.userId)
          .filter(Boolean);

        if (userIds.length === 0) {
          console.log(`No user IDs for entry ${notification.entryId}`);
          await supabase
            .from('NotificationConfig')
            .update({ notificationSent: true, sentAt: new Date().toISOString() })
            .eq('id', notification.id);
          continue;
        }

        // Format race time
        const raceTime = new Date(entry.scheduledTime);
        const timeStr = raceTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: regatta.timezone || 'America/New_York',
        });

        // Build notification body
        let body = `Race at ${timeStr}`;
        if (entry.meetingLocation) {
          body = `Meet at ${entry.meetingLocation} - Race at ${timeStr}`;
        }

        // Send notification via existing send-notification function
        const { error: sendError } = await supabase.functions.invoke('send-notification', {
          body: {
            teamId: regatta.teamId,
            userIds,
            title: `Race Reminder: ${entry.eventName}`,
            body,
            url: `/regattas/${regatta.id}`,
            tag: `race-${notification.entryId}`,
          },
        });

        if (sendError) {
          console.error(`Failed to send notification for entry ${notification.entryId}:`, sendError);
          failCount++;
          continue;
        }

        // Mark notification as sent
        await supabase
          .from('NotificationConfig')
          .update({
            notificationSent: true,
            sentAt: new Date().toISOString(),
          })
          .eq('id', notification.id);

        console.log(`Sent race notification for ${entry.eventName} to ${userIds.length} athletes`);
        successCount++;
      } catch (err) {
        console.error(`Error processing notification ${notification.id}:`, err);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: dueNotifications.length,
        success: successCount,
        failed: failCount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
