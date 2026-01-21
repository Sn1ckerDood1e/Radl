import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateEquipmentSchema } from '@/lib/validations/equipment';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';
import { computeEquipmentReadiness } from '@/lib/equipment/readiness';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get single equipment with damage reports and readiness status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { user, claims, error } = await getClaimsForApiRoute();
    if (error || !user) return unauthorizedResponse();
    if (!claims?.team_id) return forbiddenResponse('No team associated with user');

    // Find equipment by id AND teamId for RLS compliance
    // Include open damage reports for readiness computation
    const equipment = await prisma.equipment.findFirst({
      where: {
        id,
        teamId: claims.team_id,
      },
      include: {
        damageReports: {
          where: { status: 'OPEN' },
          select: { id: true, description: true, location: true },
        },
      },
    });

    if (!equipment) return notFoundResponse('Equipment');

    // Compute readiness status
    const equipmentWithReadiness = computeEquipmentReadiness(equipment);

    // Also fetch full damage report history for the detail view
    const fullDamageReports = await prisma.damageReport.findMany({
      where: { equipmentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      equipment: {
        ...equipmentWithReadiness,
        damageReports: fullDamageReports,
      },
    });
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

    // Build update data, clearing note when marking available
    const updateData = { ...validationResult.data };
    if (updateData.manualUnavailable === false) {
      updateData.manualUnavailableNote = null;
    }

    // Verify equipment exists and belongs to team
    const existing = await prisma.equipment.findFirst({
      where: { id, teamId: claims.team_id },
    });

    if (!existing) return notFoundResponse('Equipment');

    // Update equipment with readiness fields included
    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        type: updateData.type,
        name: updateData.name,
        manufacturer: updateData.manufacturer,
        serialNumber: updateData.serialNumber,
        yearAcquired: updateData.yearAcquired,
        purchasePrice: updateData.purchasePrice,
        status: updateData.status,
        notes: updateData.notes,
        boatClass: updateData.boatClass,
        weightCategory: updateData.weightCategory,
        manualUnavailable: updateData.manualUnavailable,
        manualUnavailableNote: updateData.manualUnavailableNote,
      },
      include: {
        damageReports: {
          where: { status: 'OPEN' },
          select: { id: true, description: true, location: true },
        },
      },
    });

    // Compute readiness status for response
    const equipmentWithReadiness = computeEquipmentReadiness(updatedEquipment);

    return NextResponse.json({
      success: true,
      equipment: equipmentWithReadiness,
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
