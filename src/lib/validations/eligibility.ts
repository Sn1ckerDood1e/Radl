import { z } from 'zod';

// Schema for updating single athlete's eligibility
export const updateEligibilitySchema = z.object({
  isEligible: z.boolean().optional(),
  waiverSigned: z.boolean().optional(),
  swimTestPassed: z.boolean().optional(),
  customFields: z.record(z.string(), z.boolean()).optional(), // { "CPR Certified": true, ... }
});

// Schema for bulk eligibility operations (initialize season)
export const bulkEligibilitySchema = z.object({
  athleteIds: z.array(z.string().uuid()),
  defaults: z.object({
    isEligible: z.boolean().default(false),
    waiverSigned: z.boolean().default(false),
    swimTestPassed: z.boolean().default(false),
    customFields: z.record(z.string(), z.boolean()).default({}),
  }).optional(),
});

// Schema for adding custom field to all eligibility records
export const addCustomFieldSchema = z.object({
  fieldName: z.string().min(1).max(50),
  defaultValue: z.boolean().default(false),
});
