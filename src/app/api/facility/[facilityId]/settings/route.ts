import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().url().optional().nullable().or(z.literal('')),
  description: z.string().max(1000).optional().nullable(),
  bookingWindowDays: z.number().int().min(1).max(365).optional(),
});

interface RouteContext {
  params: Promise<{ facilityId: string }>;
}

// GET /api/facility/[facilityId]/settings - Get facility settings
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { facilityId } = await context.params;

    const { user, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Verify user is in facility view mode
    if (viewMode !== 'facility') {
      return forbiddenResponse('Facility view required');
    }

    // Verify FACILITY_ADMIN role
    const membership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!membership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        phone: true,
        email: true,
        website: true,
        description: true,
        logoUrl: true,
        billingType: true,
        bookingWindowDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!facility) {
      return notFoundResponse('Facility');
    }

    return NextResponse.json({ facility });
  } catch (err) {
    return serverErrorResponse(err, 'facility-settings:GET');
  }
}

// PATCH /api/facility/[facilityId]/settings - Update facility settings
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { facilityId } = await context.params;

    const { user, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    // Verify user is in facility view mode
    if (viewMode !== 'facility') {
      return forbiddenResponse('Facility view required');
    }

    // Verify FACILITY_ADMIN role
    const membership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!membership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    // Verify facility exists
    const existing = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!existing) {
      return notFoundResponse('Facility');
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Transform empty strings to null for optional URL/email fields
    const data = { ...validation.data };
    if (data.email === '') data.email = null;
    if (data.website === '') data.website = null;

    // Update facility
    const facility = await prisma.facility.update({
      where: { id: facilityId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        phone: true,
        email: true,
        website: true,
        description: true,
        logoUrl: true,
        billingType: true,
        bookingWindowDays: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ facility });
  } catch (err) {
    return serverErrorResponse(err, 'facility-settings:PATCH');
  }
}
