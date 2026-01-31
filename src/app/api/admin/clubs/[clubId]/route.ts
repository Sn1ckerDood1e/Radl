import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminContext } from '@/lib/auth/admin-authorize';
import { createAdminAuditLogger } from '@/lib/audit/logger';
import { updateClubSchema } from '@/lib/validations/club';
import { unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ clubId: string }>;
}

/**
 * Club detail response type with full info
 */
interface ClubDetail {
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
  settings: {
    id: string;
    damageNotifyUserIds: string[];
    readinessInspectSoonDays: number;
    readinessNeedsAttentionDays: number;
    readinessOutOfServiceDays: number;
  } | null;
  memberCount: number;
  equipmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/admin/clubs/[clubId]
 *
 * Get detailed club information including facility, settings, and counts.
 * Super admin only.
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

    // Fetch club with all related data
    const club = await prisma.team.findUnique({
      where: { id: clubId },
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
        settings: {
          select: {
            id: true,
            damageNotifyUserIds: true,
            readinessInspectSoonDays: true,
            readinessNeedsAttentionDays: true,
            readinessOutOfServiceDays: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clubMemberships: {
              where: { isActive: true },
            },
            clubEquipment: true,
          },
        },
      },
    });

    if (!club) {
      return notFoundResponse('Club');
    }

    // Transform to response format
    const clubDetail: ClubDetail = {
      id: club.id,
      name: club.name,
      slug: club.slug,
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      logoUrl: club.logoUrl,
      joinCode: club.joinCode,
      facilityId: club.facilityId,
      facility: club.facility,
      settings: club.settings,
      memberCount: club._count.clubMemberships,
      equipmentCount: club._count.clubEquipment,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    };

    return NextResponse.json({ club: clubDetail });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs/[clubId]:GET');
  }
}

/**
 * PATCH /api/admin/clubs/[clubId]
 *
 * Update club details (name, slug, colors, logo).
 * Super admin only.
 *
 * Note: Use /move endpoint to change facility.
 *
 * Request body: { name?, slug?, primaryColor?, secondaryColor?, logoUrl? }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const parseResult = updateClubSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
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

    // Get current club state for audit log
    const existingClub = await prisma.team.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
      },
    });

    if (!existingClub) {
      return notFoundResponse('Club');
    }

    // If slug is being updated, check uniqueness
    if (updates.slug && updates.slug !== existingClub.slug) {
      const slugConflict = await prisma.team.findUnique({
        where: { slug: updates.slug },
        select: { id: true },
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A club with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update club
    const updatedClub = await prisma.team.update({
      where: { id: clubId },
      data: updates,
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
        facilityId: true,
        updatedAt: true,
      },
    });

    // Log admin action with before/after state
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_CLUB_UPDATED',
      targetType: 'Club',
      targetId: clubId,
      beforeState: {
        name: existingClub.name,
        slug: existingClub.slug,
        primaryColor: existingClub.primaryColor,
        secondaryColor: existingClub.secondaryColor,
        logoUrl: existingClub.logoUrl,
      },
      afterState: {
        name: updatedClub.name,
        slug: updatedClub.slug,
        primaryColor: updatedClub.primaryColor,
        secondaryColor: updatedClub.secondaryColor,
        logoUrl: updatedClub.logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      club: updatedClub,
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs/[clubId]:PATCH');
  }
}

/**
 * DELETE /api/admin/clubs/[clubId]
 *
 * Delete a club with cascade impact warning.
 * Super admin only.
 *
 * Without ?confirm=true: Returns cascade counts (members, equipment, etc.)
 * With ?confirm=true: Actually deletes the club
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check if confirm flag is set
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm') === 'true';

    // Get club with cascade counts
    const club = await prisma.team.findUnique({
      where: { id: clubId },
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
        _count: {
          select: {
            clubMemberships: true,
            clubEquipment: true,
            members: true,
            practices: true,
            seasons: true,
            invitations: true,
          },
        },
      },
    });

    if (!club) {
      return notFoundResponse('Club');
    }

    // If no confirm, return cascade impact warning
    if (!confirm) {
      return NextResponse.json({
        club: {
          id: club.id,
          name: club.name,
          slug: club.slug,
          facilityName: club.facility?.name || null,
        },
        cascade: {
          memberships: club._count.clubMemberships,
          equipment: club._count.clubEquipment,
          legacyMembers: club._count.members,
          practices: club._count.practices,
          seasons: club._count.seasons,
          invitations: club._count.invitations,
        },
        warning: 'This action cannot be undone. All related data will be deleted.',
        confirmUrl: `/api/admin/clubs/${clubId}?confirm=true`,
      });
    }

    // Actually delete the club (cascades handle related records)
    await prisma.team.delete({
      where: { id: clubId },
    });

    // Log admin action
    const audit = createAdminAuditLogger(request, adminContext.userId);
    await audit.log({
      action: 'ADMIN_CLUB_DELETED',
      targetType: 'Club',
      targetId: clubId,
      beforeState: {
        name: club.name,
        slug: club.slug,
        facilityId: club.facilityId,
        membershipCount: club._count.clubMemberships,
        equipmentCount: club._count.clubEquipment,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        clubId,
        name: club.name,
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/clubs/[clubId]:DELETE');
  }
}
