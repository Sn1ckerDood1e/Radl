import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEquipmentSchema } from '@/lib/validations/equipment';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { computeMultipleEquipmentReadiness } from '@/lib/equipment/readiness';

// GET: List equipment for current team with readiness status
export async function GET(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';

    // Get equipment for the team with open damage reports for readiness computation
    const equipment = await prisma.equipment.findMany({
      where: { teamId: claims.team_id },
      include: {
        damageReports: {
          where: { status: 'OPEN' },
          select: { id: true, description: true, location: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    // Compute readiness status for all equipment
    const equipmentWithReadiness = computeMultipleEquipmentReadiness(equipment);

    // Optionally filter to available only
    const result = availableOnly
      ? equipmentWithReadiness.filter(e => e.isAvailable)
      : equipmentWithReadiness;

    return NextResponse.json({ equipment: result });
  } catch (error) {
    return serverErrorResponse(error, 'equipment:GET');
  }
}

// POST: Create equipment (coach only)
export async function POST(request: NextRequest) {
  try {
    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can add equipment');

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createEquipmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create the equipment
    const equipment = await prisma.equipment.create({
      data: {
        teamId: claims.team_id,
        type: data.type,
        name: data.name,
        manufacturer: data.manufacturer,
        serialNumber: data.serialNumber,
        yearAcquired: data.yearAcquired,
        purchasePrice: data.purchasePrice,
        notes: data.notes,
        boatClass: data.boatClass,
        weightCategory: data.weightCategory,
      },
    });

    return NextResponse.json(
      {
        success: true,
        equipment: {
          id: equipment.id,
          type: equipment.type,
          name: equipment.name,
          manufacturer: equipment.manufacturer,
          serialNumber: equipment.serialNumber,
          yearAcquired: equipment.yearAcquired,
          purchasePrice: equipment.purchasePrice,
          status: equipment.status,
          notes: equipment.notes,
          boatClass: equipment.boatClass,
          weightCategory: equipment.weightCategory,
          createdAt: equipment.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorResponse(error, 'equipment:POST');
  }
}
