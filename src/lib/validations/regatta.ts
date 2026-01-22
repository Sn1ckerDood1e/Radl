import { z } from 'zod';

// Enums matching Prisma schema
export const regattaSourceSchema = z.enum(['REGATTA_CENTRAL', 'MANUAL']);
export const entryStatusSchema = z.enum(['SCHEDULED', 'SCRATCHED', 'COMPLETED']);
export const seatSideSchema = z.enum(['PORT', 'STARBOARD', 'NONE']);

// Create regatta schema (manual creation)
export const createRegattaSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  location: z.string().max(200).optional(),
  venue: z.string().max(200).optional(),
  timezone: z.string().max(50).optional(), // IANA timezone
  startDate: z.string().datetime(), // ISO string
  endDate: z.string().datetime().optional(),
});

// Update regatta schema
export const updateRegattaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().max(200).nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  timezone: z.string().max(50).nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

// Create entry schema (manual race entry)
export const createEntrySchema = z.object({
  regattaId: z.string().uuid(),
  eventName: z.string().min(1, 'Event name is required').max(200),
  eventCode: z.string().max(50).optional(),
  scheduledTime: z.string().datetime(),
  meetingLocation: z.string().max(200).optional(),
  meetingTime: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  heat: z.string().max(50).optional(),
  lane: z.number().int().min(1).max(20).optional(),
});

// Update entry schema
export const updateEntrySchema = z.object({
  eventName: z.string().min(1).max(200).optional(),
  eventCode: z.string().max(50).nullable().optional(),
  scheduledTime: z.string().datetime().optional(),
  meetingLocation: z.string().max(200).nullable().optional(),
  meetingTime: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: entryStatusSchema.optional(),
  heat: z.string().max(50).nullable().optional(),
  lane: z.number().int().min(1).max(20).nullable().optional(),
  placement: z.number().int().min(1).nullable().optional(),
});

// Entry seat schema (for lineup assignment)
export const entrySeatSchema = z.object({
  athleteId: z.string().uuid(),
  position: z.number().int().min(1).max(9),
  side: seatSideSchema,
});

// Entry lineup schema (assign lineup to entry)
export const entryLineupSchema = z.object({
  entryId: z.string().uuid(),
  boatId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  seats: z.array(entrySeatSchema),
}).refine(
  (data) => {
    const athleteIds = data.seats.map((s) => s.athleteId);
    return athleteIds.length === new Set(athleteIds).size;
  },
  { message: 'Each athlete can only be assigned to one seat', path: ['seats'] }
).refine(
  (data) => {
    const positions = data.seats.map((s) => s.position);
    return positions.length === new Set(positions).size;
  },
  { message: 'Each position can only have one athlete', path: ['seats'] }
);

// Update entry lineup schema
export const updateEntryLineupSchema = z.object({
  boatId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  seats: z.array(entrySeatSchema).optional(),
}).refine(
  (data) => {
    if (!data.seats) return true;
    const athleteIds = data.seats.map((s) => s.athleteId);
    return athleteIds.length === new Set(athleteIds).size;
  },
  { message: 'Each athlete can only be assigned to one seat', path: ['seats'] }
).refine(
  (data) => {
    if (!data.seats) return true;
    const positions = data.seats.map((s) => s.position);
    return positions.length === new Set(positions).size;
  },
  { message: 'Each position can only have one athlete', path: ['seats'] }
);

// Notification config schema
export const notificationConfigSchema = z.object({
  entryId: z.string().uuid(),
  leadTimeMinutes: z.number().int().min(5).max(480).default(60), // 5 min to 8 hours
});

// Update notification config schema
export const updateNotificationConfigSchema = z.object({
  leadTimeMinutes: z.number().int().min(5).max(480).optional(),
});

// Type exports
export type RegattaSource = z.infer<typeof regattaSourceSchema>;
export type EntryStatus = z.infer<typeof entryStatusSchema>;
export type CreateRegattaInput = z.infer<typeof createRegattaSchema>;
export type UpdateRegattaInput = z.infer<typeof updateRegattaSchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type EntrySeat = z.infer<typeof entrySeatSchema>;
export type EntryLineupInput = z.infer<typeof entryLineupSchema>;
export type UpdateEntryLineupInput = z.infer<typeof updateEntryLineupSchema>;
export type NotificationConfigInput = z.infer<typeof notificationConfigSchema>;
export type UpdateNotificationConfigInput = z.infer<typeof updateNotificationConfigSchema>;
