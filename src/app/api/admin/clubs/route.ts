import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { createClubSchema } from '@/lib/validations/club';
import { generateSlug } from '@/lib/utils/slug';
import { generateTeamCode } from '@/lib/utils/team-code';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

/**
 * Club with stats response type for list endpoint
 */
interface ClubWithStats {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  joinCode: string;
  facilityId: string | null;
  facility: {
    id: string;
    name: string;
    slug: string;
  } | null;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/admin/clubs
 *
 * List all clubs with member counts and facility info.
 * Super admin only.
 *
 * Query params:
 * - facilityId: Filter clubs by facility (optional)
 * - page: Page number (1-indexed, default 1)
 * - perPage: Clubs per page (default 25, max 100)
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
    const facilityId = searchParams.get('facilityId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') || '25', 10)));
    const skip = (page - 1) * perPage;

    // Build where clause
    const where = facilityId ? { facilityId } : {};

    // Fetch total count
    const total = await prisma.team.count({ where });

    // Fetch clubs with facility and membership counts
    const clubs = await prisma.team.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
        joinCode: true,
        facilityId: true,
        facility: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clubMemberships: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: perPage,
    });

    // Transform to response format
    const clubsWithStats: ClubWithStats[] = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      logoUrl: club.logoUrl,
      joinCode: club.joinCode,
      facilityId: club.facilityId,
      facility: club.facility,
      memberCount: club._count.clubMemberships,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    }));

    return NextResponse.json({
      clubs: clubsWithStats,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs:GET');
  }
}

/**
 * POST /api/admin/clubs
 *
 * Create a new club assigned to a facility.
 * Super admin only.
 *
 * Request body: { name, slug?, facilityId, primaryColor?, secondaryColor? }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
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

    // Validate request body
    const parseResult = createClubSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { name, slug: providedSlug, facilityId, primaryColor, secondaryColor } = parseResult.data;

    // Verify facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true },
    });

    if (!facility) {
      return notFoundResponse('Facility');
    }

    // Generate or validate slug
    const slug = providedSlug || generateSlug(name);

    // Check slug uniqueness
    const existingClub = await prisma.team.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingClub) {
      return NextResponse.json(
        { error: 'A club with this slug already exists' },
        { status: 409 }
      );
    }

    // Generate join code
    const joinCode = generateTeamCode();

    // Create club with settings in a transaction
    const club = await prisma.$transaction(async (tx) => {
      // Create the club (Team)
      const newClub = await tx.team.create({
        data: {
          name,
          slug,
          facilityId,
          primaryColor,
          secondaryColor,
          joinCode,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
          joinCode: true,
          facilityId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create TeamSettings record (required relation)
      await tx.teamSettings.create({
        data: {
          teamId: newClub.id,
        },
      });

      return newClub;
    });

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_CLUB_CREATED',
      targetType: 'Club',
      targetId: club.id,
      afterState: {
        name: club.name,
        slug: club.slug,
        facilityId: club.facilityId,
        primaryColor: club.primaryColor,
        secondaryColor: club.secondaryColor,
      },
    });

    return NextResponse.json(
      {
        success: true,
        club: {
          ...club,
          facility: {
            id: facility.id,
            name: facility.name,
          },
          memberCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs:POST');
  }
}
