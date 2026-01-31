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

/**
 * Supabase auth user type for admin operations
 */
export interface AdminUser {
  id: string;
  email: string | undefined;
  phone: string | undefined;
  created_at: string;
  updated_at: string | undefined;
  last_sign_in_at: string | undefined;
  email_confirmed_at: string | undefined;
  user_metadata: {
    display_name?: string;
    full_name?: string;
    [key: string]: unknown;
  };
  app_metadata: {
    provider?: string;
    providers?: string[];
    [key: string]: unknown;
  };
  banned_until: string | undefined;
}

/**
 * List users with pagination support using admin API
 * @param page - Page number (1-indexed)
 * @param perPage - Users per page (default 25)
 * @returns Paginated user list with total count
 */
export async function listUsersWithPagination(
  page: number = 1,
  perPage: number = 25
): Promise<{ users: AdminUser[]; total: number } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  try {
    // Supabase admin API uses page-based pagination
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error('Failed to list users:', error);
      return null;
    }

    // Map to our AdminUser type
    const users: AdminUser[] = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      user_metadata: (user.user_metadata || {}) as AdminUser['user_metadata'],
      app_metadata: (user.app_metadata || {}) as AdminUser['app_metadata'],
      banned_until: user.banned_until,
    }));

    // Supabase may return total in some versions, fallback to users.length
    const total = 'total' in data ? (data as { total?: number }).total : undefined;
    return {
      users,
      total: total ?? users.length,
    };
  } catch (err) {
    console.error('Error listing users:', err);
    return null;
  }
}

/**
 * Get a single user by ID using admin API
 * @param userId - The user's UUID
 * @returns User data or null if not found
 */
export async function getUserById(userId: string): Promise<AdminUser | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);

    if (error) {
      console.error('Failed to get user:', error);
      return null;
    }

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      phone: data.user.phone,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at,
      last_sign_in_at: data.user.last_sign_in_at,
      email_confirmed_at: data.user.email_confirmed_at,
      user_metadata: (data.user.user_metadata || {}) as AdminUser['user_metadata'],
      app_metadata: (data.user.app_metadata || {}) as AdminUser['app_metadata'],
      banned_until: data.user.banned_until,
    };
  } catch (err) {
    console.error('Error getting user:', err);
    return null;
  }
}

/**
 * Update a user's profile using admin API
 * @param userId - The user's UUID
 * @param updates - Profile updates (email, phone, display_name)
 * @returns Updated user data or null on error
 */
export async function updateUserById(
  userId: string,
  updates: {
    email?: string;
    phone?: string;
    display_name?: string;
  }
): Promise<AdminUser | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  try {
    // Build update payload
    const updatePayload: {
      email?: string;
      phone?: string;
      user_metadata?: { display_name?: string };
    } = {};

    if (updates.email !== undefined) {
      updatePayload.email = updates.email;
    }

    if (updates.phone !== undefined) {
      updatePayload.phone = updates.phone;
    }

    if (updates.display_name !== undefined) {
      updatePayload.user_metadata = { display_name: updates.display_name };
    }

    const { data, error } = await admin.auth.admin.updateUserById(userId, updatePayload);

    if (error) {
      console.error('Failed to update user:', error);
      return null;
    }

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      phone: data.user.phone,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at,
      last_sign_in_at: data.user.last_sign_in_at,
      email_confirmed_at: data.user.email_confirmed_at,
      user_metadata: (data.user.user_metadata || {}) as AdminUser['user_metadata'],
      app_metadata: (data.user.app_metadata || {}) as AdminUser['app_metadata'],
      banned_until: data.user.banned_until,
    };
  } catch (err) {
    console.error('Error updating user:', err);
    return null;
  }
}
