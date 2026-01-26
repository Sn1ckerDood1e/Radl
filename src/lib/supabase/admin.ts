// src/lib/supabase/admin.ts
// Admin client for operations requiring service role (e.g., user email lookup)
// Gracefully returns null when SUPABASE_SERVICE_ROLE_KEY not configured

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Get Supabase admin client with service role
 * Returns null if service role key not configured
 *
 * IMPORTANT: Only use for admin operations, never expose to client
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase admin client not available: SUPABASE_SERVICE_ROLE_KEY not set');
    return null;
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Get user emails by user IDs using admin API
 * Returns only emails for users found, empty array if admin not available
 */
export async function getUserEmailsByIds(userIds: string[]): Promise<{ userId: string; email: string }[]> {
  const admin = getSupabaseAdmin();
  if (!admin || userIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await admin.auth.admin.listUsers();

    if (error) {
      console.error('Failed to list users:', error);
      return [];
    }

    const userIdSet = new Set(userIds);
    const results: { userId: string; email: string }[] = [];

    for (const user of data.users) {
      if (userIdSet.has(user.id) && user.email) {
        results.push({ userId: user.id, email: user.email });
      }
    }

    return results;
  } catch (err) {
    console.error('Error fetching user emails:', err);
    return [];
  }
}
