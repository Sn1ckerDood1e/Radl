import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * Maximum users per batch for bulk creation.
 * Prevents timeout and memory issues.
 */
const MAX_BATCH_SIZE = 100;

/**
 * Individual user result in bulk operation.
 */
interface UserResult {
  email: string;
  status: 'created' | 'skipped' | 'failed';
  userId?: string;
  reason?: string;
  inviteSent?: boolean;
}

/**
 * Schema for single user in bulk create request.
 */
const bulkUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * Schema for bulk create request body.
 */
const bulkCreateSchema = z.object({
  users: z
    .array(bulkUserSchema)
    .min(1, 'At least one user is required')
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} users per batch`),
});

type BulkUser = z.infer<typeof bulkUserSchema>;

/**
 * POST /api/admin/users/bulk
 *
 * Create multiple users in a single operation (USER-09).
 * Super admin only.
 *
 * Request body: { users: Array<{ email: string, displayName?: string, phone?: string }> }
 * Max 100 users per batch.
 *
 * For each user:
 * - Check if email already exists (skip if so)
 * - Create user in Supabase Auth
 * - Send password setup email via invite
 * - Track success/skip/fail status
 *
 * Response: {
 *   success: boolean,
 *   results: UserResult[],
 *   summary: { created: number, skipped: number, failed: number }
 * }
 *
 * Partial failures are reported without blocking successful creations.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parseResult = bulkCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { users } = parseResult.data;

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Admin operations not available' },
        { status: 500 }
      );
    }

    // Fetch existing users to check for duplicates
    // Note: This fetches all users; for very large user bases,
    // consider paginating or using direct email lookup
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[admin/users/bulk:POST] Failed to list users:', listError);
      return serverErrorResponse(listError, 'admin/users/bulk:POST:listUsers');
    }

    // Build email lookup map (case-insensitive)
    const existingEmailMap = new Map<string, string>();
    for (const user of existingUsers.users) {
      if (user.email) {
        existingEmailMap.set(user.email.toLowerCase(), user.id);
      }
    }

    // Process each user
    const results: UserResult[] = [];
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const userData of users) {
      const emailLower = userData.email.toLowerCase();

      // Check if user already exists
      const existingUserId = existingEmailMap.get(emailLower);
      if (existingUserId) {
        results.push({
          email: userData.email,
          status: 'skipped',
          userId: existingUserId,
          reason: 'User already exists',
        });
        skippedCount++;
        continue;
      }

      // Create user
      const createResult = await createSingleUser(supabase, userData);
      results.push(createResult);

      if (createResult.status === 'created') {
        createdCount++;
        // Add to existing map to prevent duplicates within same batch
        existingEmailMap.set(emailLower, createResult.userId!);
      } else {
        failedCount++;
      }
    }

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_USERS_BULK_CREATED',
      targetType: 'User',
      afterState: {
        totalRequested: users.length,
        created: createdCount,
        skipped: skippedCount,
        failed: failedCount,
        emails: users.map((u) => u.email),
      },
    });

    return NextResponse.json({
      success: failedCount === 0,
      results,
      summary: {
        total: users.length,
        created: createdCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/users/bulk:POST');
  }
}

/**
 * Create a single user with error handling.
 */
async function createSingleUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userData: BulkUser
): Promise<UserResult> {
  try {
    // Create user via Supabase Admin API
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: userData.email,
      email_confirm: false,
      user_metadata: {
        display_name: userData.displayName || null,
        phone: userData.phone || null,
      },
    });

    if (createError) {
      console.error(`[admin/users/bulk:POST] Failed to create user ${userData.email}:`, createError);
      return {
        email: userData.email,
        status: 'failed',
        reason: createError.message || 'Failed to create user',
      };
    }

    const newUser = createData.user;

    // Send password setup email
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(userData.email);
    if (inviteError) {
      console.warn(`[admin/users/bulk:POST] Failed to send invite to ${userData.email}:`, inviteError);
    }

    return {
      email: userData.email,
      status: 'created',
      userId: newUser.id,
      inviteSent: !inviteError,
    };
  } catch (err) {
    console.error(`[admin/users/bulk:POST] Error creating user ${userData.email}:`, err);
    return {
      email: userData.email,
      status: 'failed',
      reason: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
