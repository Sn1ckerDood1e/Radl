import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClaimsForApiRoute } from '@/lib/auth/claims';
import { prisma } from '@/lib/prisma';
import { approveBooking, denyBooking, cancelBooking } from '@/lib/equipment/booking';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/errors';

const updateBookingSchema = z.object({
  action: z.enum(['approve', 'deny', 'cancel']),
  reason: z.string().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

// GET /api/equipment/bookings/[bookingId] - Get single booking details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { bookingId } = await context.params;

    const { user, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return unauthorizedResponse();
    }

    const booking = await prisma.equipmentBooking.findUnique({
      where: { id: bookingId },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
            boatClass: true,
            facilityId: true,
          }
        },
        club: { select: { id: true, name: true, slug: true } },
        practice: { select: { id: true, name: true, date: true } },
      },
    });

    if (!booking) {
      return notFoundResponse('Booking');
    }

    return NextResponse.json({ booking });
  } catch (err) {
    return serverErrorResponse(err, 'equipment-bookings-id:GET');
  }
}

// PATCH /api/equipment/bookings/[bookingId] - Approve/deny/cancel booking
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { bookingId } = await context.params;

    const { user, clubId, facilityId, viewMode, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return unauthorizedResponse();
    }

    // Get booking to check permissions
    const booking = await prisma.equipmentBooking.findUnique({
      where: { id: bookingId },
      include: {
        equipment: { select: { facilityId: true } },
        club: { select: { id: true } },
      },
    });

    if (!booking) {
      return notFoundResponse('Booking');
    }

    const body = await request.json();
    const validation = updateBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    // Permission checks based on action
    if (action === 'cancel') {
      // Only the requesting club can cancel
      if (booking.clubId !== clubId) {
        return forbiddenResponse('Can only cancel your own bookings');
      }

      const result = await cancelBooking(bookingId, user.id);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else {
      // Approve/deny requires FACILITY_ADMIN
      if (viewMode !== 'facility' || !booking.equipment.facilityId) {
        return forbiddenResponse('Only facility admins can approve/deny');
      }

      const facilityMembership = await prisma.facilityMembership.findFirst({
        where: {
          facilityId: booking.equipment.facilityId,
          userId: user.id,
          isActive: true,
          roles: { has: 'FACILITY_ADMIN' },
        },
      });

      if (!facilityMembership) {
        return forbiddenResponse();
      }

      if (action === 'approve') {
        const result = await approveBooking(bookingId, user.id);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      } else {
        const result = await denyBooking(bookingId, user.id, reason);
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
      }
    }

    // Return updated booking
    const updatedBooking = await prisma.equipmentBooking.findUnique({
      where: { id: bookingId },
      include: {
        equipment: { select: { id: true, name: true, type: true } },
        club: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ booking: updatedBooking });
  } catch (err) {
    return serverErrorResponse(err, 'equipment-bookings-id:PATCH');
  }
}

// DELETE /api/equipment/bookings/[bookingId] - Delete booking (facility admin only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { bookingId } = await context.params;

    const { user, error } = await getClaimsForApiRoute();

    if (error || !user) {
      return unauthorizedResponse();
    }

    const booking = await prisma.equipmentBooking.findUnique({
      where: { id: bookingId },
      include: {
        equipment: { select: { facilityId: true } },
      },
    });

    if (!booking) {
      return notFoundResponse('Booking');
    }

    // Only facility admin can delete
    if (!booking.equipment.facilityId) {
      return forbiddenResponse('Cannot delete non-facility booking');
    }

    const facilityMembership = await prisma.facilityMembership.findFirst({
      where: {
        facilityId: booking.equipment.facilityId,
        userId: user.id,
        isActive: true,
        roles: { has: 'FACILITY_ADMIN' },
      },
    });

    if (!facilityMembership) {
      return forbiddenResponse();
    }

    await prisma.equipmentBooking.delete({
      where: { id: bookingId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverErrorResponse(err, 'equipment-bookings-id:DELETE');
  }
}
