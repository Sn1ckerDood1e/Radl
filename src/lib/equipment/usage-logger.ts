import { prisma } from '@/lib/prisma';
import type { EquipmentUsageLog } from '@/generated/prisma';

/**
 * Create or update equipment usage log when boat is assigned to a lineup.
 * Idempotent - won't duplicate logs for same equipment + practice combination.
 *
 * @param params - Usage log parameters
 * @returns Created or updated usage log entry
 */
export async function createUsageLog({
  equipmentId,
  teamId,
  practiceId,
  lineupId,
  usageDate,
}: {
  equipmentId: string;
  teamId: string;
  practiceId: string;
  lineupId: string;
  usageDate: Date;
}): Promise<EquipmentUsageLog> {
  // Check if log already exists for this equipment + practice
  const existing = await prisma.equipmentUsageLog.findFirst({
    where: {
      equipmentId,
      practiceId,
    },
  });

  if (existing) {
    // Update lineupId if different
    if (existing.lineupId !== lineupId) {
      return await prisma.equipmentUsageLog.update({
        where: { id: existing.id },
        data: { lineupId },
      });
    }
    // Already exists with same lineupId, return as-is
    return existing;
  }

  // Create new log entry
  return await prisma.equipmentUsageLog.create({
    data: {
      equipmentId,
      teamId,
      practiceId,
      lineupId,
      usageDate,
    },
  });
}

/**
 * Delete all usage logs associated with a lineup.
 * Called when lineup is deleted or boat is unassigned.
 *
 * @param lineupId - The lineup ID to delete logs for
 */
export async function deleteUsageLogForLineup(lineupId: string): Promise<void> {
  await prisma.equipmentUsageLog.deleteMany({
    where: { lineupId },
  });
}

/**
 * Get usage logs for a specific piece of equipment with practice details.
 * Supports date range filtering and result limiting.
 *
 * @param equipmentId - Equipment ID to get logs for
 * @param options - Optional filters (startDate, endDate, limit)
 * @returns Array of usage logs with practice details
 */
export async function getUsageLogsForEquipment(
  equipmentId: string,
  options?: { startDate?: Date; endDate?: Date; limit?: number }
): Promise<
  Array<
    EquipmentUsageLog & {
      practice: {
        id: string;
        name: string;
        date: Date;
      };
    }
  >
> {
  const { startDate, endDate, limit = 50 } = options || {};

  const where: {
    equipmentId: string;
    usageDate?: {
      gte?: Date;
      lte?: Date;
    };
  } = { equipmentId };

  // Add date range filter if provided
  if (startDate || endDate) {
    where.usageDate = {};
    if (startDate) where.usageDate.gte = startDate;
    if (endDate) where.usageDate.lte = endDate;
  }

  return await prisma.equipmentUsageLog.findMany({
    where,
    include: {
      practice: {
        select: {
          id: true,
          name: true,
          date: true,
        },
      },
    },
    orderBy: { usageDate: 'desc' },
    take: limit,
  });
}

/**
 * Get usage logs for all team equipment with equipment and practice details.
 * Supports date range filtering and equipment-specific filtering.
 *
 * @param teamId - Team ID to get logs for
 * @param options - Optional filters (startDate, endDate, equipmentId)
 * @returns Array of usage logs with equipment and practice details
 */
export async function getUsageLogsForTeam(
  teamId: string,
  options?: { startDate?: Date; endDate?: Date; equipmentId?: string }
): Promise<
  Array<
    EquipmentUsageLog & {
      equipment: {
        id: string;
        name: string;
        boatClass: string | null;
      };
      practice: {
        id: string;
        name: string;
        date: Date;
      };
    }
  >
> {
  const { startDate, endDate, equipmentId } = options || {};

  const where: {
    teamId: string;
    equipmentId?: string;
    usageDate?: {
      gte?: Date;
      lte?: Date;
    };
  } = { teamId };

  // Add equipment filter if provided
  if (equipmentId) {
    where.equipmentId = equipmentId;
  }

  // Add date range filter if provided
  if (startDate || endDate) {
    where.usageDate = {};
    if (startDate) where.usageDate.gte = startDate;
    if (endDate) where.usageDate.lte = endDate;
  }

  return await prisma.equipmentUsageLog.findMany({
    where,
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          boatClass: true,
        },
      },
      practice: {
        select: {
          id: true,
          name: true,
          date: true,
        },
      },
    },
    orderBy: { usageDate: 'desc' },
  });
}
