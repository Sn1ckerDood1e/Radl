import { prisma } from '@/lib/prisma';
import { BookingStatus } from '@/generated/prisma';

export interface BookingConflict {
  bookingId: string;
  clubName: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
}

/**
 * Check if equipment is available for a given time range.
 * Returns conflicts if any exist.
 */
export async function checkEquipmentAvailability(
  equipmentId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<{ available: boolean; conflicts: BookingConflict[] }> {
  // Find overlapping bookings that are PENDING or APPROVED
  const overlapping = await prisma.equipmentBooking.findMany({
    where: {
      equipmentId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ['PENDING', 'APPROVED'] },
      // Overlap condition: starts before our end AND ends after our start
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
    include: {
      club: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  const conflicts: BookingConflict[] = overlapping.map((booking) => ({
    bookingId: booking.id,
    clubName: booking.club.name,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
  }));

  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Create a booking request for shared equipment.
 * Validates availability and sends notification to equipment owner.
 */
export async function createEquipmentBooking(params: {
  equipmentId: string;
  clubId: string;
  practiceId?: string;
  startTime: Date;
  endTime: Date;
  requestedBy: string;
  notes?: string;
}): Promise<{ success: boolean; bookingId?: string; error?: string; conflicts?: BookingConflict[] }> {
  const { equipmentId, clubId, practiceId, startTime, endTime, requestedBy, notes } = params;

  // Validate time range
  if (startTime >= endTime) {
    return { success: false, error: 'End time must be after start time' };
  }

  // Check equipment exists and is bookable (facility-owned or shared)
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      facility: { select: { id: true, name: true, bookingWindowDays: true } },
    },
  });

  if (!equipment) {
    return { success: false, error: 'Equipment not found' };
  }

  if (equipment.ownerType !== 'FACILITY' && !equipment.isShared) {
    return { success: false, error: 'Equipment is not available for booking' };
  }

  // Check booking window
  const bookingWindowDays = equipment.facility?.bookingWindowDays ?? 30;
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + bookingWindowDays);

  if (startTime > maxBookingDate) {
    return {
      success: false,
      error: `Cannot book more than ${bookingWindowDays} days in advance`
    };
  }

  // Check availability
  const { available, conflicts } = await checkEquipmentAvailability(equipmentId, startTime, endTime);

  if (!available) {
    return { success: false, error: 'Equipment not available for selected time', conflicts };
  }

  // Create booking in transaction with notification
  const result = await prisma.$transaction(async (tx) => {
    // Create booking
    const booking = await tx.equipmentBooking.create({
      data: {
        equipmentId,
        clubId,
        practiceId,
        startTime,
        endTime,
        requestedBy,
        notes,
        status: 'PENDING',
      },
    });

    // If facility-owned, get facility admins to notify
    if (equipment.facilityId) {
      const facilityAdmins = await tx.facilityMembership.findMany({
        where: {
          facilityId: equipment.facilityId,
          isActive: true,
          roles: { has: 'FACILITY_ADMIN' },
        },
        select: { userId: true },
      });

      // Get requesting club name
      const club = await tx.team.findUnique({
        where: { id: clubId },
        select: { name: true },
      });

      // Create notifications for all facility admins
      for (const admin of facilityAdmins) {
        await tx.notification.create({
          data: {
            teamId: clubId, // Use requesting club as teamId for scoping
            userId: admin.userId,
            type: 'EQUIPMENT_REQUEST',
            title: 'Equipment Booking Request',
            message: `${club?.name || 'A club'} requested to book ${equipment.name}`,
            linkUrl: `/facility/${equipment.facilityId}/equipment/requests`,
          },
        });
      }
    }

    return booking;
  });

  return { success: true, bookingId: result.id };
}

/**
 * Get bookings for a piece of equipment or a club.
 */
export async function getEquipmentBookings(params: {
  equipmentId?: string;
  clubId?: string;
  facilityId?: string;
  status?: BookingStatus | BookingStatus[];
  fromDate?: Date;
  toDate?: Date;
}) {
  const { equipmentId, clubId, facilityId, status, fromDate, toDate } = params;

  return prisma.equipmentBooking.findMany({
    where: {
      equipmentId,
      clubId,
      equipment: facilityId ? { facilityId } : undefined,
      status: status
        ? Array.isArray(status)
          ? { in: status }
          : status
        : undefined,
      startTime: fromDate ? { gte: fromDate } : undefined,
      endTime: toDate ? { lte: toDate } : undefined,
    },
    include: {
      equipment: { select: { id: true, name: true, type: true, boatClass: true } },
      club: { select: { id: true, name: true, slug: true } },
      practice: { select: { id: true, name: true, date: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Approve a booking request.
 */
export async function approveBooking(
  bookingId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const booking = await prisma.equipmentBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.status !== 'PENDING') {
    return { success: false, error: 'Booking is not pending' };
  }

  // Re-check availability (another booking may have been approved in the meantime)
  const { available } = await checkEquipmentAvailability(
    booking.equipmentId,
    booking.startTime,
    booking.endTime,
    bookingId
  );

  if (!available) {
    return { success: false, error: 'Time slot is no longer available' };
  }

  await prisma.equipmentBooking.update({
    where: { id: bookingId },
    data: {
      status: 'APPROVED',
      approvedBy,
    },
  });

  return { success: true };
}

/**
 * Deny a booking request.
 */
export async function denyBooking(
  bookingId: string,
  deniedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const booking = await prisma.equipmentBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.status !== 'PENDING') {
    return { success: false, error: 'Booking is not pending' };
  }

  await prisma.equipmentBooking.update({
    where: { id: bookingId },
    data: {
      status: 'DENIED',
      deniedReason: reason,
    },
  });

  return { success: true };
}

/**
 * Cancel a booking (by the requesting club).
 */
export async function cancelBooking(
  bookingId: string,
  cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
  const booking = await prisma.equipmentBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.status === 'CANCELLED' || booking.status === 'DENIED') {
    return { success: false, error: 'Booking is already cancelled or denied' };
  }

  await prisma.equipmentBooking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  });

  return { success: true };
}
