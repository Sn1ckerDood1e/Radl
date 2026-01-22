/**
 * Push notification trigger functions.
 * Fire-and-forget calls to Supabase Edge Function for notification dispatch.
 *
 * All functions are non-blocking - they don't await and don't throw.
 * Failures are logged but never propagate to callers.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Internal helper to invoke the send-notification Edge Function.
 * Fire-and-forget: catches all errors and logs them.
 */
function sendNotification(params: {
  teamId: string;
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): void {
  // Skip if Supabase not configured (dev environment)
  if (!supabaseUrl || !supabaseKey) {
    console.log('[push] Supabase not configured, skipping notification');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fire-and-forget: don't await
  supabase.functions
    .invoke('send-notification', { body: params })
    .then((result) => {
      if (result.error) {
        console.warn('[push] Notification failed:', result.error.message);
      } else {
        const data = result.data as { sent?: number; failed?: number; total?: number };
        console.log(`[push] Notification sent: ${data.sent}/${data.total}`);
      }
    })
    .catch((error) => {
      console.warn('[push] Notification error:', error);
    });
}

/**
 * Notify athletes they've been assigned to a lineup.
 *
 * @param teamId - Team ID for notification routing
 * @param athleteUserIds - User IDs of athletes to notify
 * @param practiceName - Name of the practice
 * @param practiceDate - Date of the practice
 * @param practiceId - Practice ID for URL
 */
export function notifyLineupAssignment(
  teamId: string,
  athleteUserIds: string[],
  practiceName: string,
  practiceDate: Date,
  practiceId: string
): void {
  if (athleteUserIds.length === 0) return;

  const dateStr = practiceDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  sendNotification({
    teamId,
    userIds: athleteUserIds,
    title: 'Lineup Assignment',
    body: `You've been added to the lineup for ${practiceName} on ${dateStr}`,
    url: `/practices/${practiceId}`,
    tag: `lineup-${practiceId}`,
  });
}

/**
 * Notify all team members about a practice change.
 *
 * @param teamId - Team ID for notification routing
 * @param practiceName - Name of the practice
 * @param practiceDate - Date of the practice
 * @param practiceId - Practice ID for URL
 * @param changeDescription - Brief description of what changed
 */
export function notifyPracticeChange(
  teamId: string,
  practiceName: string,
  practiceDate: Date,
  practiceId: string,
  changeDescription: string
): void {
  const dateStr = practiceDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  sendNotification({
    teamId,
    title: 'Practice Updated',
    body: `${practiceName} (${dateStr}): ${changeDescription}`,
    url: `/practices/${practiceId}`,
    tag: `practice-change-${practiceId}`,
  });
}

/**
 * Notify all team members about a practice cancellation.
 *
 * @param teamId - Team ID for notification routing
 * @param practiceName - Name of the practice
 * @param practiceDate - Date of the practice
 */
export function notifyPracticeCancelled(
  teamId: string,
  practiceName: string,
  practiceDate: Date
): void {
  const dateStr = practiceDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  sendNotification({
    teamId,
    title: 'Practice Cancelled',
    body: `${practiceName} on ${dateStr} has been cancelled`,
    url: '/schedule',
    tag: 'practice-cancelled',
  });
}

/**
 * Notify coaches when a new athlete joins the team.
 *
 * @param teamId - Team ID for notification routing
 * @param coachUserIds - User IDs of coaches to notify
 * @param athleteName - Name of the new athlete
 */
export function notifyAthleteJoined(
  teamId: string,
  coachUserIds: string[],
  athleteName: string
): void {
  if (coachUserIds.length === 0) return;

  sendNotification({
    teamId,
    userIds: coachUserIds,
    title: 'New Athlete Joined',
    body: `${athleteName} has joined your team`,
    url: '/roster',
    tag: 'athlete-joined',
  });
}

/**
 * Notify coaches when damage is reported on equipment.
 *
 * @param teamId - Team ID for notification routing
 * @param coachUserIds - User IDs of coaches to notify
 * @param equipmentName - Name of the damaged equipment
 * @param location - Location description from damage report
 * @param reportId - Damage report ID for URL
 */
export function notifyDamageReported(
  teamId: string,
  coachUserIds: string[],
  equipmentName: string,
  location: string,
  reportId: string
): void {
  if (coachUserIds.length === 0) return;

  sendNotification({
    teamId,
    userIds: coachUserIds,
    title: 'Damage Reported',
    body: `${equipmentName}: ${location}`,
    url: `/equipment/damage/${reportId}`,
    tag: `damage-${reportId}`,
  });
}

/**
 * Notify athletes about an upcoming race (manual trigger).
 * Used for ad-hoc race reminders outside the automated schedule.
 *
 * @param teamId - Team ID for notification routing
 * @param athleteUserIds - User IDs of athletes to notify
 * @param eventName - Name of the event/race
 * @param raceTime - Scheduled race time
 * @param meetingLocation - Optional meeting location
 * @param regattaId - Regatta ID for URL
 * @param entryId - Entry ID for tag
 */
export function notifyRaceReminder(
  teamId: string,
  athleteUserIds: string[],
  eventName: string,
  raceTime: Date,
  meetingLocation: string | null,
  regattaId: string,
  entryId: string
): void {
  if (athleteUserIds.length === 0) return;

  const timeStr = raceTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  let body = `Race at ${timeStr}`;
  if (meetingLocation) {
    body = `Meet at ${meetingLocation} - Race at ${timeStr}`;
  }

  sendNotification({
    teamId,
    userIds: athleteUserIds,
    title: `Race Reminder: ${eventName}`,
    body,
    url: `/regattas/${regattaId}`,
    tag: `race-${entryId}`,
  });
}
