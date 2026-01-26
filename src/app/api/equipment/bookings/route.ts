import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import {
  getEquipmentBookings,
  createEquipmentBooking,
} from '@/lib/equipment/booking';
import { unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/errors';

const createBookingSchema = z.object({
  equipmentId: z.string().uuid(),
  practiceId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

// GET /api/equipment/bookings - List bookings for current club/facility
export async function GET(request: NextRequest) {
  try {
    const { user, clubId, facilityId, viewMode, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId') || undefined;
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',') as ('PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED')[] : undefined;

    // If in facility view, show all facility bookings
    // If in club view, show club's bookings
    const bookings = await getEquipmentBookings({
      equipmentId,
      clubId: viewMode === 'club' ? clubId ?? undefined : undefined,
      facilityId: viewMode === 'facility' ? facilityId ?? undefined : undefined,
      status,
    });

    return NextResponse.json({ bookings });
  } catch (err) {
    return serverErrorResponse(err, 'equipment-bookings:GET');
  }
}

// POST /api/equipment/bookings - Create a booking request
export async function POST(request: NextRequest) {
  try {
    const { user, clubId, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return unauthorizedResponse();
    }

    if (!clubId) {
      return NextResponse.json({ error: 'No club context' }, { status: 400 });
    }

    // Verify user can book on behalf of club (needs at least COACH role)
    const membership = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        userId: user.id,
        isActive: true,
        roles: { hasSome: ['CLUB_ADMIN', 'COACH'] },
      },
    });

    // Fallback to TeamMember
    const teamMember = membership ? null : await prisma.teamMember.findFirst({
      where: {
        teamId: clubId,
        userId: user.id,
        role: { in: ['CLUB_ADMIN', 'COACH'] },
      },
    });

    if (!membership && !teamMember) {
      return forbiddenResponse('Only coaches can book equipment');
    }

    const body = await request.json();
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { equipmentId, practiceId, startTime, endTime, notes } = validation.data;

    const result = await createEquipmentBooking({
      equipmentId,
      clubId,
      practiceId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      requestedBy: user.id,
      notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, conflicts: result.conflicts },
        { status: 409 }
      );
    }

    return NextResponse.json({ bookingId: result.bookingId }, { status: 201 });
  } catch (err) {
    return serverErrorResponse(err, 'equipment-bookings:POST');
  }
}
