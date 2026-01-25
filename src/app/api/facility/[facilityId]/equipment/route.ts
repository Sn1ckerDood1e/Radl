import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { createEquipmentSchema } from '@/lib/validations/equipment';

interface RouteContext {
  params: Promise<{ facilityId: string }>;
}

// GET: List facility equipment with damage reports
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user, facilityId: userFacilityId, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    const { facilityId } = await context.params;

    // Verify user has facility context
    if (viewMode !== 'facility') {
      return forbiddenResponse('Facility view required');
    }

    // Verify user has FACILITY_ADMIN role for this facility
    const facilityMembership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!facilityMembership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    // Get facility-owned equipment with damage reports
    const equipment = await prisma.equipment.findMany({
      where: {
        facilityId,
        ownerType: 'FACILITY',
      },
      include: {
        damageReports: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ equipment });
  } catch (err) {
    return serverErrorResponse(err, 'facility-equipment:GET');
  }
}

// POST: Create new facility equipment
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user, facilityId: userFacilityId, viewMode, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();

    const { facilityId } = await context.params;

    // Verify user has facility context
    if (viewMode !== 'facility') {
      return forbiddenResponse('Facility view required');
    }

    // Verify user has FACILITY_ADMIN role for this facility
    const facilityMembership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!facilityMembership) {
      return forbiddenResponse('FACILITY_ADMIN role required');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createEquipmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      type,
      name,
      manufacturer,
      serialNumber,
      yearAcquired,
      purchasePrice,
      notes,
      boatClass,
      weightCategory,
    } = validationResult.data;

    // Create facility-owned equipment
    const equipment = await prisma.equipment.create({
      data: {
        facilityId,
        ownerType: 'FACILITY',
        type,
        name,
        manufacturer: manufacturer || null,
        serialNumber: serialNumber || null,
        yearAcquired: yearAcquired || null,
        purchasePrice: purchasePrice || null,
        notes: notes || null,
        boatClass: boatClass || null,
        weightCategory: weightCategory || null,
        status: 'ACTIVE',
        isShared: true, // Facility equipment is always shared
      },
    });

    return NextResponse.json({ equipment }, { status: 201 });
  } catch (err) {
    return serverErrorResponse(err, 'facility-equipment:POST');
  }
}
