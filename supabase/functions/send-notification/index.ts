// Supabase Edge Function for sending push notifications
// Deploy with: supabase functions deploy send-notification
//
// Required secrets (set via Supabase dashboard or CLI):
// - VAPID_PUBLIC_KEY
// - VAPID_PRIVATE_KEY
// - VAPID_SUBJECT (optional, defaults to mailto:admin@radl.sol)
//
// Request body:
// {
//   teamId: string,           // Required: send to all team members
//   userIds?: string[],       // Optional: filter to specific users
//   title: string,            // Required: notification title
//   body: string,             // Required: notification body
//   url?: string,             // Optional: URL to open on click
//   tag?: string,             // Optional: notification tag (for grouping)
// }

// @ts-expect-error Deno imports not recognized by TypeScript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error Deno imports not recognized by TypeScript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Use npm: prefix for web-push in Deno
// @ts-expect-error npm import syntax
import webpush from 'npm:web-push@3.6.7';

interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

serve(async (req: Request) => {
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@radl.sol';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Parse request body
    const { teamId, userIds, title, body, url, tag } = await req.json();

    if (!teamId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'teamId, title, and body required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for subscriptions
    let query = supabase
      .from('PushSubscription')
      .select('endpoint, p256dh, auth, userId')
      .eq('teamId', teamId);

    // Filter by specific users if provided
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query = query.in('userId', userIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Failed to fetch subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build notification payload
    const payload: NotificationPayload = {
      title,
      body,
      url: url || '/',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: tag || 'radl-notification',
    };

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      (subscriptions as PushSubscriptionRecord[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload)
          );
          return { userId: sub.userId, success: true };
        } catch (err: unknown) {
          const pushError = err as { statusCode?: number; message?: string };

          // Handle expired subscriptions (410 Gone)
          if (pushError.statusCode === 410) {
            console.log(`Removing expired subscription for user ${sub.userId}`);
            await supabase
              .from('PushSubscription')
              .delete()
              .eq('endpoint', sub.endpoint);
          }

          return {
            userId: sub.userId,
            success: false,
            error: pushError.message || 'Unknown error'
          };
        }
      })
    );

    // Count successes and failures
    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as { success: boolean }).success
    ).length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
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
