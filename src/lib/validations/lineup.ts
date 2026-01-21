import { z } from 'zod';

// Enums matching Prisma schema
export const seatSideSchema = z.enum(['PORT', 'STARBOARD', 'NONE']);

// Seat assignment schema
export const seatAssignmentSchema = z.object({
  athleteId: z.string().uuid(),
  position: z.number().int().min(1).max(9),
  side: seatSideSchema,
});

// Create lineup schema
export const createLineupSchema = z.object({
  blockId: z.string().uuid(),
  boatId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  seats: z.array(seatAssignmentSchema),
}).refine(
  (data) => {
    // Check for duplicate athleteIds
    const athleteIds = data.seats.map((s) => s.athleteId);
    const uniqueAthleteIds = new Set(athleteIds);
    return athleteIds.length === uniqueAthleteIds.size;
  },
  { message: 'Each athlete can only be assigned to one seat', path: ['seats'] }
).refine(
  (data) => {
    // Check for duplicate positions
    const positions = data.seats.map((s) => s.position);
    const uniquePositions = new Set(positions);
    return positions.length === uniquePositions.size;
  },
  { message: 'Each position can only have one athlete', path: ['seats'] }
);

// Update lineup schema
export const updateLineupSchema = z.object({
  boatId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  seats: z.array(seatAssignmentSchema).optional(),
}).refine(
  (data) => {
    if (!data.seats) return true;
    // Check for duplicate athleteIds
    const athleteIds = data.seats.map((s) => s.athleteId);
    const uniqueAthleteIds = new Set(athleteIds);
    return athleteIds.length === uniqueAthleteIds.size;
  },
  { message: 'Each athlete can only be assigned to one seat', path: ['seats'] }
).refine(
  (data) => {
    if (!data.seats) return true;
    // Check for duplicate positions
    const positions = data.seats.map((s) => s.position);
    const uniquePositions = new Set(positions);
    return positions.length === uniquePositions.size;
  },
  { message: 'Each position can only have one athlete', path: ['seats'] }
);

// Template seat schema
export const templateSeatSchema = z.object({
  athleteId: z.string().uuid().optional(),
  position: z.number().int().min(1).max(9),
  side: seatSideSchema,
});

// Create lineup template schema
export const createLineupTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  boatClass: z.enum([
    'SINGLE_1X',
    'DOUBLE_2X',
    'PAIR_2_MINUS',
    'COXED_PAIR_2_PLUS',
    'FOUR_4_MINUS',
    'COXED_FOUR_4_PLUS',
    'QUAD_4X',
    'EIGHT_8_PLUS',
    'OTHER',
  ]),
  defaultBoatId: z.string().uuid().optional(),
  seats: z.array(templateSeatSchema),
});

// Update lineup template schema
export const updateLineupTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  boatClass: z.enum([
    'SINGLE_1X',
    'DOUBLE_2X',
    'PAIR_2_MINUS',
    'COXED_PAIR_2_PLUS',
    'FOUR_4_MINUS',
    'COXED_FOUR_4_PLUS',
    'QUAD_4X',
    'EIGHT_8_PLUS',
    'OTHER',
  ]).optional(),
  defaultBoatId: z.string().uuid().nullable().optional(),
  seats: z.array(templateSeatSchema).optional(),
});

// Land assignment schema
export const createLandAssignmentSchema = z.object({
  blockId: z.string().uuid(),
  athleteIds: z.array(z.string().uuid()).min(1, 'At least one athlete required'),
});

// Type exports
export type SeatSide = z.infer<typeof seatSideSchema>;
export type SeatAssignment = z.infer<typeof seatAssignmentSchema>;
export type CreateLineupInput = z.infer<typeof createLineupSchema>;
export type UpdateLineupInput = z.infer<typeof updateLineupSchema>;
export type TemplateSeat = z.infer<typeof templateSeatSchema>;
export type CreateLineupTemplateInput = z.infer<typeof createLineupTemplateSchema>;
export type UpdateLineupTemplateInput = z.infer<typeof updateLineupTemplateSchema>;
export type CreateLandAssignmentInput = z.infer<typeof createLandAssignmentSchema>;
