import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { updateFacilitySchema } from '@/lib/validations/facility';

interface RouteParams {
  params: Promise<{ facilityId: string }>;
}

/**
 * GET /api/admin/facilities/[facilityId]
 *
 * Get detailed facility information including nested clubs and stats.
 * Super admin only (FCLT-04).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { facilityId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(facilityId)) {
      return notFoundResponse('Facility');
    }

    // Fetch facility with clubs and counts
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        clubs: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            _count: {
              select: {
                clubMemberships: {
                  where: { isActive: true },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            clubs: true,
            memberships: {
              where: { isActive: true },
            },
            equipment: true,
          },
        },
      },
    });

    if (!facility) {
      return notFoundResponse('Facility');
    }

    // Build detailed response
    return NextResponse.json({
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
        billingType: facility.billingType,
        bookingWindowDays: facility.bookingWindowDays,
        createdAt: facility.createdAt,
        updatedAt: facility.updatedAt,
        // Aggregate stats
        stats: {
          clubCount: facility._count.clubs,
          memberCount: facility._count.memberships,
          equipmentCount: facility._count.equipment,
        },
        // Nested clubs with member counts
        clubs: facility.clubs.map((club) => ({
          id: club.id,
          name: club.name,
          slug: club.slug,
          createdAt: club.createdAt,
          memberCount: club._count.clubMemberships,
        })),
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/facilities/[facilityId]:GET');
  }
}

/**
 * PATCH /api/admin/facilities/[facilityId]
 *
 * Update facility details.
 * Super admin only (FCLT-03).
 *
 * Request body: UpdateFacilityInput (partial)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { facilityId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(facilityId)) {
      return notFoundResponse('Facility');
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
    const parseResult = updateFacilitySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Get current facility state for audit log
    const existingFacility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!existingFacility) {
      return notFoundResponse('Facility');
    }

    // If slug is being updated, check uniqueness
    if (updates.slug && updates.slug !== existingFacility.slug) {
      const slugExists = await prisma.facility.findUnique({
        where: { slug: updates.slug },
        select: { id: true },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug already in use' },
          { status: 409 }
        );
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email || null;
    if (updates.website !== undefined) updateData.website = updates.website || null;
    if (updates.description !== undefined) updateData.description = updates.description;

    // Update facility
    const updatedFacility = await prisma.facility.update({
      where: { id: facilityId },
      data: updateData,
    });

    // Log admin action with before/after state
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_FACILITY_UPDATED',
      targetType: 'Facility',
      targetId: facilityId,
      beforeState: {
        name: existingFacility.name,
        slug: existingFacility.slug,
        city: existingFacility.city,
        state: existingFacility.state,
        country: existingFacility.country,
      },
      afterState: {
        name: updatedFacility.name,
        slug: updatedFacility.slug,
        city: updatedFacility.city,
        state: updatedFacility.state,
        country: updatedFacility.country,
      },
    });

    return NextResponse.json({
      success: true,
      facility: {
        id: updatedFacility.id,
        name: updatedFacility.name,
        slug: updatedFacility.slug,
        address: updatedFacility.address,
        city: updatedFacility.city,
        state: updatedFacility.state,
        country: updatedFacility.country,
        timezone: updatedFacility.timezone,
        phone: updatedFacility.phone,
        email: updatedFacility.email,
        website: updatedFacility.website,
        description: updatedFacility.description,
        updatedAt: updatedFacility.updatedAt,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/facilities/[facilityId]:PATCH');
  }
}

/**
 * DELETE /api/admin/facilities/[facilityId]
 *
 * Delete a facility with cascade impact preview.
 * Super admin only (FCLT-05).
 *
 * Query params:
 * - confirm=true: Actually perform deletion (otherwise returns cascade impact)
 *
 * Without ?confirm=true: Returns cascade impact counts
 * With ?confirm=true: Deletes facility and cascades
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify super admin access
    const adminContext = await getSuperAdminContext();
    if (!adminContext) {
      return unauthorizedResponse();
    }

    const { facilityId } = await params;
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm') === 'true';

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(facilityId)) {
      return notFoundResponse('Facility');
    }

    // Fetch facility with cascade counts
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        _count: {
          select: {
            clubs: true,
            memberships: true,
            equipment: true,
          },
        },
      },
    });

    if (!facility) {
      return notFoundResponse('Facility');
    }

    // Count nested resources that would be affected
    const clubIds = await prisma.team.findMany({
      where: { facilityId },
      select: { id: true },
    });

    // Get counts of nested resources in clubs
    let totalPractices = 0;
    let totalSeasons = 0;
    let totalClubMembers = 0;

    if (clubIds.length > 0) {
      const clubIdList = clubIds.map((c) => c.id);

      const [practiceCount, seasonCount, clubMemberCount] = await Promise.all([
        prisma.practice.count({ where: { teamId: { in: clubIdList } } }),
        prisma.season.count({ where: { teamId: { in: clubIdList } } }),
        prisma.clubMembership.count({ where: { clubId: { in: clubIdList } } }),
      ]);

      totalPractices = practiceCount;
      totalSeasons = seasonCount;
      totalClubMembers = clubMemberCount;
    }

    const cascadeImpact = {
      clubs: facility._count.clubs,
      facilityMemberships: facility._count.memberships,
      equipment: facility._count.equipment,
      clubMemberships: totalClubMembers,
      practices: totalPractices,
      seasons: totalSeasons,
    };

    // If not confirmed, return cascade impact preview
    if (!confirm) {
      return NextResponse.json({
        facility: {
          id: facility.id,
          name: facility.name,
          slug: facility.slug,
        },
        cascadeImpact,
        message: 'Add ?confirm=true to delete this facility and all related data.',
      });
    }

    // Confirmed - delete facility (cascades via Prisma relations)
    await prisma.facility.delete({
      where: { id: facilityId },
    });

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_FACILITY_DELETED',
      targetType: 'Facility',
      targetId: facilityId,
      beforeState: {
        name: facility.name,
        slug: facility.slug,
        city: facility.city,
        state: facility.state,
      },
      metadata: {
        cascadeImpact,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        id: facilityId,
        name: facility.name,
      },
      cascadeImpact,
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/facilities/[facilityId]:DELETE');
  }
}
