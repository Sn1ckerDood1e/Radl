import type { Equipment, DamageReport } from '@/generated/prisma';

/**
 * Equipment with computed readiness/availability status.
 * Availability is derived from:
 * 1. manualUnavailable flag (coach override)
 * 2. Open damage reports
 */
export interface EquipmentWithReadiness extends Equipment {
  damageReports: Pick<DamageReport, 'id' | 'description' | 'location'>[];
  isAvailable: boolean;
  unavailableReasons: string[];
}

/**
 * Type for equipment with damage reports included from Prisma query.
 * Use this when querying equipment with open damage reports.
 */
export type EquipmentWithDamageReports = Equipment & {
  damageReports: Pick<DamageReport, 'id' | 'description' | 'location'>[];
};

/**
 * Compute readiness status for a single piece of equipment.
 * Availability is computed at query time, not stored.
 *
 * @param equipment - Equipment with damage reports included
 * @returns Equipment with isAvailable and unavailableReasons computed
 */
export function computeEquipmentReadiness(
  equipment: EquipmentWithDamageReports
): EquipmentWithReadiness {
  const unavailableReasons: string[] = [];

  // Check manual unavailability (coach override)
  if (equipment.manualUnavailable) {
    unavailableReasons.push(
      equipment.manualUnavailableNote || 'Marked unavailable by coach'
    );
  }

  // Check open damage reports
  for (const report of equipment.damageReports) {
    const truncatedDescription = report.description.length > 50
      ? `${report.description.slice(0, 50)}...`
      : report.description;
    unavailableReasons.push(
      `Damage: ${report.location} - ${truncatedDescription}`
    );
  }

  return {
    ...equipment,
    isAvailable: unavailableReasons.length === 0,
    unavailableReasons,
  };
}

/**
 * Compute readiness status for multiple pieces of equipment.
 * Use for batch processing in list endpoints.
 *
 * @param equipmentList - Array of equipment with damage reports included
 * @returns Array of equipment with isAvailable and unavailableReasons computed
 */
export function computeMultipleEquipmentReadiness(
  equipmentList: EquipmentWithDamageReports[]
): EquipmentWithReadiness[] {
  return equipmentList.map(computeEquipmentReadiness);
}
