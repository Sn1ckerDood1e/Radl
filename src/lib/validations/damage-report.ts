import { z } from 'zod';

export const createDamageReportSchema = z.object({
  location: z.string().min(1, 'Please describe where on the equipment'),
  description: z.string().min(10, 'Please provide at least 10 characters'),
});

export const resolveDamageReportSchema = z.object({
  resolvedBy: z.string().uuid(),
});

export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>;
export type ResolveDamageReportInput = z.infer<typeof resolveDamageReportSchema>;
