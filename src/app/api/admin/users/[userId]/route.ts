import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getUserById, updateUserById } from '@/lib/supabase/admin';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * User detail response type with full membership information
 */
interface UserDetail {
  id: string;
  email: string | undefined;
  displayName: string | undefined;
  phone: string | undefined;
  createdAt: string;
  updatedAt: string | undefined;
  lastSignInAt: string | undefined;
  emailConfirmed: boolean;
  provider: string | undefined;
  isBanned: boolean;
  bannedUntil: string | undefined;
  facilities: {
    id: string;
    name: string;
    slug: string;
    roles: string[];
    joinedAt: Date;
  }[];
  clubs: {
    id: string;
    name: string;
    slug: string;
    roles: string[];
    facilityId: string | null;
    facilityName: string | null;
    joinedAt: Date;
  }[];
  teamMemberships: {
    id: string;
    teamId: string;
    teamName: string;
    role: string;
    createdAt: Date;
  }[];
}

/**
 * GET /api/admin/users/[userId]
 *
 * Get detailed user information including all memberships.
 * Super admin only.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { userId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return notFoundResponse('User');
    }

    // Fetch user from Supabase Auth
    const user = await getUserById(userId);
    if (!user) {
      return notFoundResponse('User');
    }

    // Fetch facility memberships
    const facilityMemberships = await prisma.facilityMembership.findMany({
      where: { userId },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Fetch club memberships
    const clubMemberships = await prisma.clubMembership.findMany({
      where: { userId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            facilityId: true,
            facility: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Fetch legacy team memberships (for backward compatibility)
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build response
    const userDetail: UserDetail = {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.user_metadata?.full_name,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastSignInAt: user.last_sign_in_at,
      emailConfirmed: !!user.email_confirmed_at,
      provider: user.app_metadata?.provider,
      isBanned: !!user.banned_until,
      bannedUntil: user.banned_until,
      facilities: facilityMemberships.map((fm) => ({
        id: fm.facility.id,
        name: fm.facility.name,
        slug: fm.facility.slug,
        roles: fm.roles,
        joinedAt: fm.joinedAt,
      })),
      clubs: clubMemberships.map((cm) => ({
        id: cm.club.id,
        name: cm.club.name,
        slug: cm.club.slug,
        roles: cm.roles,
        facilityId: cm.club.facilityId,
        facilityName: cm.club.facility?.name || null,
        joinedAt: cm.joinedAt,
      })),
      teamMemberships: teamMemberships.map((tm) => ({
        id: tm.id,
        teamId: tm.team.id,
        teamName: tm.team.name,
        role: tm.role,
        createdAt: tm.createdAt,
      })),
    };

    return NextResponse.json({ user: userDetail });
  } catch (error) {
    return serverErrorResponse(error, 'admin/users/[userId]:GET');
  }
}

/**
 * Schema for updating user profile
 */
const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
});

/**
 * PATCH /api/admin/users/[userId]
 *
 * Update user profile (name, email, phone).
 * Super admin only.
 *
 * Request body: { displayName?: string, email?: string, phone?: string | null }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { userId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return notFoundResponse('User');
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate update data
    const parseResult = updateUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    // Check if there's anything to update
    if (!updates.displayName && !updates.email && updates.phone === undefined) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Get current user state for audit log
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return notFoundResponse('User');
    }

    // Build update payload
    const updatePayload: {
      email?: string;
      phone?: string;
      display_name?: string;
    } = {};

    if (updates.displayName) {
      updatePayload.display_name = updates.displayName;
    }
    if (updates.email) {
      updatePayload.email = updates.email;
    }
    if (updates.phone !== undefined) {
      updatePayload.phone = updates.phone || '';
    }

    // Update user via Supabase Admin API
    const updatedUser = await updateUserById(userId, updatePayload);
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log admin action with before/after state
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_USER_UPDATED',
      targetType: 'User',
      targetId: userId,
      beforeState: {
        email: existingUser.email,
        displayName: existingUser.user_metadata?.display_name,
        phone: existingUser.phone,
      },
      afterState: {
        email: updatedUser.email,
        displayName: updatedUser.user_metadata?.display_name,
        phone: updatedUser.phone,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.user_metadata?.display_name,
        phone: updatedUser.phone,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/users/[userId]:PATCH');
  }
}
