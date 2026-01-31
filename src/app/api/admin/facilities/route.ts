import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, serverErrorResponse } from '@/lib/errors';
import { createFacilitySchema } from '@/lib/validations/facility';
import { generateSlug } from '@/lib/utils/slug';

/**
 * Facility response with aggregate stats
 */
interface FacilityWithStats {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  clubCount: number;
  memberCount: number;
}

/**
 * GET /api/admin/facilities
 *
 * List all facilities with aggregate stats (club count, member count).
 * Super admin only (FCLT-01).
 *
 * Query params:
 * - page: Page number (1-indexed, default 1)
 * - perPage: Items per page (default 25, max 100)
 * - search: Search term (name, city, state)
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

    // Build where clause for search
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { state: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count for pagination
    const total = await prisma.facility.count({ where: whereClause });

    // Fetch facilities with club and member counts
    const facilities = await prisma.facility.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            clubs: true,
            memberships: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    // Transform response
    const facilitiesWithStats: FacilityWithStats[] = facilities.map((facility) => ({
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
      address: facility.address,
      city: facility.city,
      state: facility.state,
      country: facility.country,
      timezone: facility.timezone,
      phone: facility.phone,
      email: facility.email,
      website: facility.website,
      description: facility.description,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
      clubCount: facility._count.clubs,
      memberCount: facility._count.memberships,
    }));

    return NextResponse.json({
      facilities: facilitiesWithStats,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/facilities:GET');
  }
}

/**
 * POST /api/admin/facilities
 *
 * Create a new facility with auto-generated slug.
 * Super admin only (FCLT-02).
 *
 * Request body: CreateFacilityInput
 * Response: 201 with created facility
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

    const parseResult = createFacilitySchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Generate slug from name if not provided
    let slug = input.slug || generateSlug(input.name);

    // Check slug uniqueness and append suffix if collision
    let attempts = 0;
    let baseSlug = slug;
    while (attempts < 10) {
      const existing = await prisma.facility.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) break;

      // Append suffix for collision
      attempts++;
      slug = `${baseSlug}-${attempts}`;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Could not generate unique slug. Please provide a custom slug.' },
        { status: 409 }
      );
    }

    // Create facility
    const facility = await prisma.facility.create({
      data: {
        name: input.name,
        slug,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        country: input.country,
        timezone: input.timezone,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        description: input.description || null,
      },
    });

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_FACILITY_CREATED',
      targetType: 'Facility',
      targetId: facility.id,
      afterState: {
        name: facility.name,
        slug: facility.slug,
        city: facility.city,
        state: facility.state,
        country: facility.country,
      },
    });

    return NextResponse.json(
      {
        success: true,
        facility: {
          id: facility.id,
          name: facility.name,
          slug: facility.slug,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          country: facility.country,
          timezone: facility.timezone,
          phone: facility.phone,
          email: facility.email,
          website: facility.website,
          description: facility.description,
          createdAt: facility.createdAt,
          updatedAt: facility.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'admin/facilities:POST');
  }
}
