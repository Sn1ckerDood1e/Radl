import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

/**
 * Maximum members per batch for bulk import.
 * Prevents timeout and memory issues.
 */
const MAX_BATCH_SIZE = 100;

/**
 * Valid roles for club membership.
 * Matches Prisma Role enum.
 */
const VALID_ROLES = ['FACILITY_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'] as const;
type Role = (typeof VALID_ROLES)[number];

/**
 * Result status for a single membership operation.
 */
type MemberStatus = 'added' | 'updated' | 'skipped' | 'failed';

/**
 * Individual member result in bulk operation.
 */
interface MemberResult {
  email: string;
  status: MemberStatus;
  membershipId?: string;
  userId?: string;
  reason?: string;
  roles?: Role[];
}

/**
 * Schema for single member in bulk add request.
 */
const bulkMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  roles: z
    .array(z.enum(VALID_ROLES))
    .min(1, 'At least one role is required')
    .default(['ATHLETE']),
});

/**
 * Schema for bulk add request body.
 */
const bulkAddSchema = z.object({
  members: z
    .array(bulkMemberSchema)
    .min(1, 'At least one member is required')
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} members per batch`),
});

type BulkMember = z.infer<typeof bulkMemberSchema>;

interface RouteParams {
  params: Promise<{ clubId: string }>;
}

/**
 * POST /api/admin/clubs/[clubId]/members/bulk
 *
 * Bulk add members to a club (MEMB-05).
 * Super admin only.
 *
 * Request body: { members: Array<{ email: string, roles?: Role[] }> }
 * Max 100 members per batch.
 *
 * For each member:
 * - Lookup user by email
 * - If user not found: skip with reason
 * - If already active member with same roles: skip
 * - If already active member with different roles: update roles
 * - If inactive membership: reactivate with new roles
 * - If new: create membership
 *
 * Response: {
 *   success: boolean,
 *   results: MemberResult[],
 *   summary: { added: number, updated: number, skipped: number, failed: number }
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { clubId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clubId)) {
      return notFoundResponse('Club');
    }

    // Verify club exists
    const club = await prisma.team.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });
    if (!club) {
      return notFoundResponse('Club');
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

    const parseResult = bulkAddSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { members } = parseResult.data;

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Admin operations not available' },
        { status: 500 }
      );
    }

    // Fetch all users to build email -> userId map
    // Note: For very large user bases, consider pagination
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[admin/clubs/[clubId]/members/bulk:POST] Failed to list users:', listError);
      return serverErrorResponse(listError, 'admin/clubs/[clubId]/members/bulk:POST:listUsers');
    }

    // Build email -> user map (case-insensitive)
    const emailToUser = new Map<string, { id: string; email: string }>();
    for (const user of allUsers.users) {
      if (user.email) {
        emailToUser.set(user.email.toLowerCase(), { id: user.id, email: user.email });
      }
    }

    // Get existing memberships for this club
    const existingMemberships = await prisma.clubMembership.findMany({
      where: { clubId },
      select: { id: true, userId: true, roles: true, isActive: true },
    });

    // Build userId -> membership map
    const userIdToMembership = new Map<string, typeof existingMemberships[0]>();
    for (const membership of existingMemberships) {
      userIdToMembership.set(membership.userId, membership);
    }

    // Process each member
    const results: MemberResult[] = [];
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const memberData of members) {
      const result = await processMember(
        prisma,
        clubId,
        memberData,
        emailToUser,
        userIdToMembership
      );
      results.push(result);

      switch (result.status) {
        case 'added':
          addedCount++;
          // Add to existing map to prevent duplicates within same batch
          if (result.userId && result.membershipId) {
            userIdToMembership.set(result.userId, {
              id: result.membershipId,
              userId: result.userId,
              roles: result.roles || ['ATHLETE'],
              isActive: true,
            });
          }
          break;
        case 'updated':
          updatedCount++;
          break;
        case 'skipped':
          skippedCount++;
          break;
        case 'failed':
          failedCount++;
          break;
      }
    }

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_MEMBERSHIPS_BULK_ADDED',
      targetType: 'ClubMembership',
      targetId: clubId,
      afterState: {
        clubId,
        clubName: club.name,
        totalRequested: members.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        emails: members.map((m) => m.email),
      },
    });

    return NextResponse.json({
      success: failedCount === 0,
      results,
      summary: {
        total: members.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs/[clubId]/members/bulk:POST');
  }
}

/**
 * Process a single member for bulk add.
 */
async function processMember(
  db: typeof prisma,
  clubId: string,
  memberData: BulkMember,
  emailToUser: Map<string, { id: string; email: string }>,
  userIdToMembership: Map<string, { id: string; userId: string; roles: string[]; isActive: boolean }>
): Promise<MemberResult> {
  const emailLower = memberData.email.toLowerCase();
  const roles = memberData.roles;

  // Lookup user by email
  const user = emailToUser.get(emailLower);
  if (!user) {
    return {
      email: memberData.email,
      status: 'skipped',
      reason: 'User not found',
    };
  }

  const existingMembership = userIdToMembership.get(user.id);

  if (existingMembership) {
    if (existingMembership.isActive) {
      // Check if roles are the same
      const existingRolesArr = existingMembership.roles;
      const newRolesArr = roles;
      const rolesMatch =
        existingRolesArr.length === newRolesArr.length &&
        existingRolesArr.every((r) => newRolesArr.includes(r as Role)) &&
        newRolesArr.every((r) => existingRolesArr.includes(r));

      if (rolesMatch) {
        // Already active with same roles - skip
        return {
          email: memberData.email,
          status: 'skipped',
          membershipId: existingMembership.id,
          userId: user.id,
          reason: 'Already a member with same roles',
          roles: roles,
        };
      }

      // Active member with different roles - update
      try {
        await db.clubMembership.update({
          where: { id: existingMembership.id },
          data: { roles },
        });

        return {
          email: memberData.email,
          status: 'updated',
          membershipId: existingMembership.id,
          userId: user.id,
          reason: `Roles updated from ${existingMembership.roles.join(',')} to ${roles.join(',')}`,
          roles: roles,
        };
      } catch (err) {
        console.error(`[bulk:processMember] Failed to update ${memberData.email}:`, err);
        return {
          email: memberData.email,
          status: 'failed',
          reason: err instanceof Error ? err.message : 'Failed to update roles',
        };
      }
    } else {
      // Inactive membership - reactivate with new roles
      try {
        const updated = await db.clubMembership.update({
          where: { id: existingMembership.id },
          data: { isActive: true, roles },
        });

        return {
          email: memberData.email,
          status: 'added',
          membershipId: updated.id,
          userId: user.id,
          reason: 'Membership reactivated',
          roles: roles,
        };
      } catch (err) {
        console.error(`[bulk:processMember] Failed to reactivate ${memberData.email}:`, err);
        return {
          email: memberData.email,
          status: 'failed',
          reason: err instanceof Error ? err.message : 'Failed to reactivate membership',
        };
      }
    }
  }

  // New membership
  try {
    const membership = await db.clubMembership.create({
      data: {
        clubId,
        userId: user.id,
        roles,
        isActive: true,
      },
    });

    return {
      email: memberData.email,
      status: 'added',
      membershipId: membership.id,
      userId: user.id,
      roles: roles,
    };
  } catch (err) {
    console.error(`[bulk:processMember] Failed to create ${memberData.email}:`, err);
    return {
      email: memberData.email,
      status: 'failed',
      reason: err instanceof Error ? err.message : 'Failed to create membership',
    };
  }
}
