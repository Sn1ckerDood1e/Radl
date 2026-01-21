import { z } from 'zod';

export const createSeasonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

export const updateSeasonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});
