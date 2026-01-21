import { z } from 'zod';

// Enums matching Prisma schema
export const blockTypeSchema = z.enum(['WATER', 'LAND', 'ERG']);
export const practiceStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

// Block schemas
export const createBlockSchema = z.object({
  type: blockTypeSchema,
  durationMinutes: z.number().int().min(5).max(480).optional(),
  category: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export const updateBlockSchema = createBlockSchema.partial();

export const reorderBlocksSchema = z.object({
  positions: z.array(
    z.object({
      blockId: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

// Practice schemas
export const createPracticeSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100),
  date: z.string().datetime(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  blocks: z.array(createBlockSchema).min(1, 'At least one block required'),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: 'End time must be after start time', path: ['endTime'] }
);

export const updatePracticeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(1000).optional().nullable(),
  status: practiceStatusSchema.optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.endTime) > new Date(data.startTime);
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['endTime'] }
);

// Type exports
export type BlockType = z.infer<typeof blockTypeSchema>;
export type PracticeStatus = z.infer<typeof practiceStatusSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type CreatePracticeInput = z.infer<typeof createPracticeSchema>;
export type UpdatePracticeInput = z.infer<typeof updatePracticeSchema>;
export type ReorderBlocksInput = z.infer<typeof reorderBlocksSchema>;
