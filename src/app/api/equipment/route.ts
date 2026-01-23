import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEquipmentSchema } from '@/lib/validations/equipment';
import { getAuthContext } from '@/lib/auth/get-auth-context';
import { accessibleBy } from '@casl/prisma';
import { ForbiddenError } from '@casl/ability';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';
import { computeMultipleEquipmentReadiness } from '@/lib/equipment/readiness';

// GET: List equipment for current club with readiness status
export async function GET(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';

    try {
      // Get equipment for the club with open damage reports for readiness computation
      // Use accessibleBy to filter to authorized equipment
      const equipment = await prisma.equipment.findMany({
        where: {
          AND: [
            accessibleBy(context.ability).Equipment,
            { teamId: context.clubId },
          ],
        },
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
      const resultData = availableOnly
        ? equipmentWithReadiness.filter(e => e.isAvailable)
        : equipmentWithReadiness;

      return NextResponse.json({ equipment: resultData });
    } catch (e) {
      if (e instanceof ForbiddenError) {
        return NextResponse.json({ equipment: [] });
      }
      throw e;
    }
  } catch (error) {
    return serverErrorResponse(error, 'equipment:GET');
  }
}

// POST: Create equipment (requires manage permission)
export async function POST(request: NextRequest) {
  try {
    const result = await getAuthContext(request);
    if (!result.success) {
      return result.status === 401
        ? unauthorizedResponse()
        : forbiddenResponse(result.error);
    }

    const { context } = result;

    // Check create permission
    if (!context.ability.can('create', 'Equipment')) {
      return forbiddenResponse('You do not have permission to add equipment');
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

    const data = validationResult.data;

    // Create the equipment
    const equipment = await prisma.equipment.create({
      data: {
        teamId: context.clubId,
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
