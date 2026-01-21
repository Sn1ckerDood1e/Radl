import { BoatClass } from '@/generated/prisma';

export type SeatSide = 'PORT' | 'STARBOARD' | 'NONE';

export interface SeatConfiguration {
  position: number;
  label: string;
  side: SeatSide;
}

// Standard rowing positions mapped by boat class
export const ROWING_POSITIONS: Record<BoatClass, SeatConfiguration[]> = {
  SINGLE_1X: [
    { position: 1, label: 'Sculler', side: 'NONE' },
  ],
  DOUBLE_2X: [
    { position: 1, label: 'Bow', side: 'NONE' },
    { position: 2, label: 'Stroke', side: 'NONE' },
  ],
  PAIR_2_MINUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: 'Stroke', side: 'STARBOARD' },
  ],
  COXED_PAIR_2_PLUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: 'Stroke', side: 'STARBOARD' },
    { position: 3, label: 'Cox', side: 'NONE' },
  ],
  FOUR_4_MINUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: '2', side: 'STARBOARD' },
    { position: 3, label: '3', side: 'PORT' },
    { position: 4, label: 'Stroke', side: 'STARBOARD' },
  ],
  COXED_FOUR_4_PLUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: '2', side: 'STARBOARD' },
    { position: 3, label: '3', side: 'PORT' },
    { position: 4, label: 'Stroke', side: 'STARBOARD' },
    { position: 5, label: 'Cox', side: 'NONE' },
  ],
  QUAD_4X: [
    { position: 1, label: 'Bow', side: 'NONE' },
    { position: 2, label: '2', side: 'NONE' },
    { position: 3, label: '3', side: 'NONE' },
    { position: 4, label: 'Stroke', side: 'NONE' },
  ],
  EIGHT_8_PLUS: [
    { position: 1, label: 'Bow', side: 'PORT' },
    { position: 2, label: '2', side: 'STARBOARD' },
    { position: 3, label: '3', side: 'PORT' },
    { position: 4, label: '4', side: 'STARBOARD' },
    { position: 5, label: '5', side: 'PORT' },
    { position: 6, label: '6', side: 'STARBOARD' },
    { position: 7, label: '7', side: 'PORT' },
    { position: 8, label: 'Stroke', side: 'STARBOARD' },
    { position: 9, label: 'Cox', side: 'NONE' },
  ],
  OTHER: [], // Custom handling required
};

// Position labels for common seats
export const POSITION_LABELS: Record<number, string> = {
  1: 'Bow',
  8: 'Stroke',
  9: 'Cox',
};

/**
 * Get seat configurations for a boat class
 * Returns array of seat objects with null athleteId (for initial lineup)
 */
export function getSeatsForBoatClass(boatClass: BoatClass): Array<{
  position: number;
  label: string;
  side: SeatSide;
  athleteId: null;
}> {
  const positions = ROWING_POSITIONS[boatClass];
  return positions.map((seat) => ({
    ...seat,
    athleteId: null,
  }));
}

/**
 * Get the number of seats for a boat class
 */
export function getCapacityForBoatClass(boatClass: BoatClass): number {
  return ROWING_POSITIONS[boatClass].length;
}

/**
 * Check if a boat class is a scull boat (not sweep)
 */
export function isScullBoat(boatClass: BoatClass): boolean {
  return ['SINGLE_1X', 'DOUBLE_2X', 'QUAD_4X'].includes(boatClass);
}
