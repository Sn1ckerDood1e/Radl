import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { getUserById } from '@/lib/supabase/admin';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ clubId: string }>;
}

/**
 * Member info returned in the response.
 */
interface MemberInfo {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  roles: string[];
  joinedAt: Date;
  isActive: boolean;
}

/**
 * GET /api/admin/clubs/[clubId]/members
 *
 * List all members of a club with user info.
 * Super admin only.
 *
 * Query params:
 * - includeInactive: "true" to include inactive members (default: false)
 *
 * Returns:
 * - 200: List of members with user info
 * - 401: Not authenticated
 * - 404: Club not found
 * - 500: Server error
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
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

    // Check if we should include inactive members
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    // Fetch memberships
    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Fetch user details for each membership
    const membersWithUserInfo: MemberInfo[] = await Promise.all(
      memberships.map(async (m) => {
        const user = await getUserById(m.userId);
        return {
          id: m.id,
          userId: m.userId,
          email: user?.email || 'Unknown',
          displayName: user?.user_metadata?.display_name || user?.user_metadata?.full_name || null,
          roles: m.roles,
          joinedAt: m.joinedAt,
          isActive: m.isActive,
        };
      })
    );

    return NextResponse.json({
      members: membersWithUserInfo,
      total: membersWithUserInfo.length,
      club: {
        id: club.id,
        name: club.name,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs/[clubId]/members:GET');
  }
}
