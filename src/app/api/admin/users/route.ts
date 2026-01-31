import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getSupabaseAdmin, listUsersWithPagination, type AdminUser } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';

/**
 * User with memberships response type
 */
interface UserWithMemberships {
  id: string;
  email: string | undefined;
  displayName: string | undefined;
  phone: string | undefined;
  createdAt: string;
  lastSignInAt: string | undefined;
  emailConfirmed: boolean;
  facilityCount: number;
  clubCount: number;
  facilities: {
    id: string;
    name: string;
    roles: string[];
  }[];
  clubs: {
    id: string;
    name: string;
    roles: string[];
    facilityName: string | null;
  }[];
}

/**
 * GET /api/admin/users
 *
 * List all platform users with pagination and search.
 * Super admin only.
 *
 * Query params:
 * - page: Page number (1-indexed, default 1)
 * - perPage: Users per page (default 25, max 100)
 * - search: Search term (email, name, facility, club)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '25', 10)));
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    // Fetch users from Supabase Auth
    const result = await listUsersWithPagination(page, perPage);
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch users from auth provider' },
        { status: 503 }
      );
    }

    // Get all user IDs for membership lookup
    const userIds = result.users.map((u) => u.id);

    // Fetch facility memberships for all users
    const facilityMemberships = await prisma.facilityMembership.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Fetch club memberships for all users
    const clubMemberships = await prisma.clubMembership.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            facility: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Group memberships by userId
    const facilityMembershipsByUser = new Map<string, typeof facilityMemberships>();
    for (const fm of facilityMemberships) {
      const existing = facilityMembershipsByUser.get(fm.userId) || [];
      existing.push(fm);
      facilityMembershipsByUser.set(fm.userId, existing);
    }

    const clubMembershipsByUser = new Map<string, typeof clubMemberships>();
    for (const cm of clubMemberships) {
      const existing = clubMembershipsByUser.get(cm.userId) || [];
      existing.push(cm);
      clubMembershipsByUser.set(cm.userId, existing);
    }

    // Build user response with memberships
    let users: UserWithMemberships[] = result.users.map((user: AdminUser) => {
      const userFacilities = facilityMembershipsByUser.get(user.id) || [];
      const userClubs = clubMembershipsByUser.get(user.id) || [];

      return {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
        phone: user.phone,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        emailConfirmed: !!user.email_confirmed_at,
        facilityCount: userFacilities.length,
        clubCount: userClubs.length,
        facilities: userFacilities.map((fm) => ({
          id: fm.facility.id,
          name: fm.facility.name,
          roles: fm.roles,
        })),
        clubs: userClubs.map((cm) => ({
          id: cm.club.id,
          name: cm.club.name,
          roles: cm.roles,
          facilityName: cm.club.facility?.name || null,
        })),
      };
    });

    // Apply search filter (client-side filtering since Supabase doesn't support server-side search well)
    if (search) {
      users = users.filter((user) => {
        // Search in email
        if (user.email?.toLowerCase().includes(search)) return true;
        // Search in display name
        if (user.displayName?.toLowerCase().includes(search)) return true;
        // Search in facility names
        if (user.facilities.some((f) => f.name.toLowerCase().includes(search))) return true;
        // Search in club names
        if (user.clubs.some((c) => c.name.toLowerCase().includes(search))) return true;
        return false;
      });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        perPage,
        total: result.total,
        totalPages: Math.ceil(result.total / perPage),
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/users:GET');
  }
}

/**
 * Schema for creating a new user via admin panel.
 */
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * POST /api/admin/users
 *
 * Create a new user without self-signup flow (USER-03).
 * Sends password setup email via Supabase invite.
 *
 * Request body: { email: string, displayName?: string, phone?: string }
 * Response: 201 with created user data
 *
 * Errors:
 * - 400: Invalid request body or email format
 * - 401: Not authenticated or not super admin
 * - 409: Email already exists
 * - 500: Supabase API error
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

    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { email, displayName, phone } = parseResult.data;

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Admin operations not available' },
        { status: 500 }
      );
    }

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[admin/users:POST] Failed to list users:', listError);
      return serverErrorResponse(listError, 'admin/users:POST:listUsers');
    }

    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'A user with this email already exists',
          existingUserId: existingUser.id,
        },
        { status: 409 }
      );
    }

    // Create user via Supabase Admin API
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false, // Don't auto-confirm, will send invite
      user_metadata: {
        display_name: displayName || null,
        phone: phone || null,
      },
    });

    if (createError) {
      console.error('[admin/users:POST] Failed to create user:', createError);
      return serverErrorResponse(createError, 'admin/users:POST:createUser');
    }

    const newUser = createData.user;

    // Send password setup email via invite
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
    if (inviteError) {
      // Log warning but don't fail - user was created
      console.warn('[admin/users:POST] Failed to send invite email:', inviteError);
    }

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_USER_CREATED',
      targetType: 'User',
      targetId: newUser.id,
      afterState: {
        email: newUser.email,
        displayName: displayName || null,
        phone: phone || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: displayName || null,
          phone: phone || null,
          createdAt: newUser.created_at,
          emailConfirmed: false,
          inviteSent: !inviteError,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'admin/users:POST');
  }
}
