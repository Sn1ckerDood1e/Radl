import { z } from 'zod';

// Severity levels matching Prisma ReportSeverity enum
export const reportSeverityValues = ['MINOR', 'MODERATE', 'CRITICAL'] as const;
export type ReportSeverity = (typeof reportSeverityValues)[number];

export const createDamageReportSchema = z.object({
  location: z.string().min(1, 'Please describe where on the equipment'),
  description: z.string().min(10, 'Please provide at least 10 characters'),
  severity: z.enum(reportSeverityValues),
  reporterName: z.string().min(2, 'Please provide your name'),
  category: z.string().optional(),
  honeypot: z.string().max(0, 'Bot detected').optional(),
});

export const resolveDamageReportSchema = z.object({
  resolvedBy: z.string().uuid(),
});

export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>;
export type ResolveDamageReportInput = z.infer<typeof resolveDamageReportSchema>;
