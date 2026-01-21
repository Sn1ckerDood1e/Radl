import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateEquipmentSchema } from '@/lib/validations/equipment';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single equipment with damage reports
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Find equipment by id AND teamId for RLS compliance
    const equipment = await prisma.equipment.findFirst({
      where: {
        id,
        teamId: claims.team_id,
      },
      include: {
        damageReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!equipment) return notFoundResponse('Equipment');

    return NextResponse.json({ equipment });
  } catch (error) {
    return serverErrorResponse(error, 'equipment/[id]:GET');
  }
}

// PATCH: Update equipment (coach only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can update equipment');

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateEquipmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Update equipment WHERE id AND teamId match
    const equipment = await prisma.equipment.updateMany({
      where: {
        id,
        teamId: claims.team_id,
      },
      data: {
        type: data.type,
        name: data.name,
        manufacturer: data.manufacturer,
        serialNumber: data.serialNumber,
        yearAcquired: data.yearAcquired,
        purchasePrice: data.purchasePrice,
        status: data.status,
        notes: data.notes,
        boatClass: data.boatClass,
        weightCategory: data.weightCategory,
      },
    });

    if (equipment.count === 0) return notFoundResponse('Equipment');

    // Fetch the updated equipment to return
    const updatedEquipment = await prisma.equipment.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      equipment: updatedEquipment,
    });
  } catch (error) {
    return serverErrorResponse(error, 'equipment/[id]:PATCH');
  }
}

// DELETE: Delete equipment (coach only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');
    if (claims.user_role !== 'COACH') return forbiddenResponse('Only coaches can delete equipment');

    // Delete equipment WHERE id AND teamId match
    const equipment = await prisma.equipment.deleteMany({
      where: {
        id,
        teamId: claims.team_id,
      },
    });

    if (equipment.count === 0) return notFoundResponse('Equipment');

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error, 'equipment/[id]:DELETE');
  }
}
