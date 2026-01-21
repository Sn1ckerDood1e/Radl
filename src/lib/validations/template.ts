import { z } from 'zod';
import { blockTypeSchema } from './practice';

// Time format regex (HH:MM, 24-hour format)
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Template block schema (for practice templates)
export const createTemplateBlockSchema = z.object({
  type: blockTypeSchema,
  durationMinutes: z.number().int().min(5).max(480).optional(),
  category: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export const updateTemplateBlockSchema = createTemplateBlockSchema.partial();

// Practice template schema
export const createPracticeTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  defaultStartTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:MM)'),
  defaultEndTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:MM)'),
  blocks: z.array(createTemplateBlockSchema).min(1, 'At least one block required'),
}).refine(
  (data) => {
    // Parse times to compare
    const [startHour, startMin] = data.defaultStartTime.split(':').map(Number);
    const [endHour, endMin] = data.defaultEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  },
  { message: 'End time must be after start time', path: ['defaultEndTime'] }
);

export const updatePracticeTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  defaultStartTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:MM)').optional(),
  defaultEndTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:MM)').optional(),
});

// Block template schema (standalone reusable blocks)
export const createBlockTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: blockTypeSchema,
  durationMinutes: z.number().int().min(5).max(480).optional(),
  category: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export const updateBlockTemplateSchema = createBlockTemplateSchema.partial().omit({ type: true }).extend({
  type: blockTypeSchema.optional(),
});

// Type exports
export type CreateTemplateBlockInput = z.infer<typeof createTemplateBlockSchema>;
export type UpdateTemplateBlockInput = z.infer<typeof updateTemplateBlockSchema>;
export type CreatePracticeTemplateInput = z.infer<typeof createPracticeTemplateSchema>;
export type UpdatePracticeTemplateInput = z.infer<typeof updatePracticeTemplateSchema>;
export type CreateBlockTemplateInput = z.infer<typeof createBlockTemplateSchema>;
export type UpdateBlockTemplateInput = z.infer<typeof updateBlockTemplateSchema>;
