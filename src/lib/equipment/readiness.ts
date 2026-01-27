import type { Equipment, DamageReport } from '@/generated/prisma';

/**
 * Equipment readiness status levels (traffic light pattern).
 * Order matters: most severe to least severe for priority checks.
 */
export type ReadinessStatus = 'OUT_OF_SERVICE' | 'NEEDS_ATTENTION' | 'INSPECT_SOON' | 'READY';

/**
 * Team-configurable thresholds for readiness calculation.
 * All values are in days since last inspection.
 */
export interface ReadinessThresholds {
  inspectSoonDays: number;      // Default: 14 - yellow warning
  needsAttentionDays: number;   // Default: 21 - amber alert
  outOfServiceDays: number;     // Default: 30 - red/blocked
}

/**
 * Default thresholds matching TeamSettings schema defaults.
 */
export const DEFAULT_READINESS_THRESHOLDS: ReadinessThresholds = {
  inspectSoonDays: 14,
  needsAttentionDays: 21,
  outOfServiceDays: 30,
};

/**
 * Result of readiness calculation including status and context.
 */
export interface EquipmentReadinessResult {
  status: ReadinessStatus;
  reasons: string[];
  daysSinceInspection: number | null;
}

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

/**
 * Equipment data needed for readiness calculation.
 * Extends base Equipment with inspection date and damage reports.
 */
export interface EquipmentForReadiness {
  manualUnavailable: boolean;
  manualUnavailableNote: string | null;
  lastInspectedAt: Date | null;
  damageReports: Array<{
    id: string;
    severity: 'MINOR' | 'MODERATE' | 'CRITICAL';
    status: 'OPEN' | 'RESOLVED';
    location: string;
  }>;
}

/**
 * Calculate equipment readiness status based on multiple factors.
 *
 * Priority order (first match wins):
 * 1. Manual override (manualUnavailable) -> OUT_OF_SERVICE
 * 2. CRITICAL damage reports -> OUT_OF_SERVICE
 * 3. Days since inspection > outOfServiceDays -> OUT_OF_SERVICE
 * 4. Never inspected (null lastInspectedAt) -> OUT_OF_SERVICE
 * 5. Days > needsAttentionDays OR MODERATE damage -> NEEDS_ATTENTION
 * 6. Days > inspectSoonDays -> INSPECT_SOON
 * 7. All checks pass -> READY
 *
 * @param equipment - Equipment with damage reports included
 * @param thresholds - Team-configured threshold values
 * @returns Readiness status with reasons and inspection days
 */
export function calculateReadinessStatus(
  equipment: EquipmentForReadiness,
  thresholds: ReadinessThresholds = DEFAULT_READINESS_THRESHOLDS
): EquipmentReadinessResult {
  const reasons: string[] = [];

  // 1. Manual override takes absolute precedence
  if (equipment.manualUnavailable) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: [equipment.manualUnavailableNote || 'Marked unavailable by coach'],
      daysSinceInspection: calculateDaysSince(equipment.lastInspectedAt),
    };
  }

  // Filter to open damage reports only
  const openReports = equipment.damageReports.filter(r => r.status === 'OPEN');

  // 2. CRITICAL damage reports -> immediate OUT_OF_SERVICE
  const criticalReports = openReports.filter(r => r.severity === 'CRITICAL');
  if (criticalReports.length > 0) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: criticalReports.map(r => `Critical damage: ${r.location}`),
      daysSinceInspection: calculateDaysSince(equipment.lastInspectedAt),
    };
  }

  // 3. Calculate days since inspection
  const daysSince = calculateDaysSince(equipment.lastInspectedAt);

  // 4. Never inspected or extremely overdue -> OUT_OF_SERVICE
  if (daysSince === null) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: ['No inspection record'],
      daysSinceInspection: null,
    };
  }

  if (daysSince > thresholds.outOfServiceDays) {
    return {
      status: 'OUT_OF_SERVICE',
      reasons: [`${daysSince} days since inspection (limit: ${thresholds.outOfServiceDays})`],
      daysSinceInspection: daysSince,
    };
  }

  // 5. MODERATE damage or approaching out-of-service -> NEEDS_ATTENTION
  const moderateReports = openReports.filter(r => r.severity === 'MODERATE');
  if (daysSince > thresholds.needsAttentionDays || moderateReports.length > 0) {
    if (moderateReports.length > 0) {
      reasons.push(`${moderateReports.length} moderate damage report(s)`);
    }
    if (daysSince > thresholds.needsAttentionDays) {
      reasons.push(`${daysSince} days since inspection`);
    }
    return {
      status: 'NEEDS_ATTENTION',
      reasons,
      daysSinceInspection: daysSince,
    };
  }

  // 6. Approaching inspection due -> INSPECT_SOON
  if (daysSince > thresholds.inspectSoonDays) {
    return {
      status: 'INSPECT_SOON',
      reasons: [`${daysSince} days since inspection`],
      daysSinceInspection: daysSince,
    };
  }

  // 7. All good -> READY
  return {
    status: 'READY',
    reasons: [],
    daysSinceInspection: daysSince,
  };
}

/**
 * Calculate days since a given date, or null if date is null.
 */
function calculateDaysSince(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate readiness status for multiple equipment items.
 * Use for batch processing in list pages and dashboard widgets.
 *
 * @param equipmentList - Array of equipment with damage reports
 * @param thresholds - Team-configured threshold values
 * @returns Array of equipment with readiness result attached
 */
export function calculateMultipleReadinessStatus<T extends EquipmentForReadiness>(
  equipmentList: T[],
  thresholds: ReadinessThresholds = DEFAULT_READINESS_THRESHOLDS
): Array<T & { readiness: EquipmentReadinessResult }> {
  return equipmentList.map(equipment => ({
    ...equipment,
    readiness: calculateReadinessStatus(equipment, thresholds),
  }));
}

/**
 * Aggregate readiness status counts for fleet health overview.
 *
 * @param equipmentList - Array of equipment with damage reports
 * @param thresholds - Team-configured threshold values
 * @returns Count of equipment in each status category
 */
export function aggregateFleetHealth<T extends EquipmentForReadiness>(
  equipmentList: T[],
  thresholds: ReadinessThresholds = DEFAULT_READINESS_THRESHOLDS
): Record<ReadinessStatus, number> {
  const counts: Record<ReadinessStatus, number> = {
    READY: 0,
    INSPECT_SOON: 0,
    NEEDS_ATTENTION: 0,
    OUT_OF_SERVICE: 0,
  };

  for (const equipment of equipmentList) {
    const { status } = calculateReadinessStatus(equipment, thresholds);
    counts[status]++;
  }

  return counts;
}
