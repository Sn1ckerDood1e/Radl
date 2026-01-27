import { z } from 'zod';

export const equipmentTypeSchema = z.enum(['SHELL', 'OAR', 'LAUNCH', 'OTHER']);
export const equipmentStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'RETIRED']);
export const boatClassSchema = z.enum([
  'SINGLE_1X', 'DOUBLE_2X', 'PAIR_2_MINUS', 'COXED_PAIR_2_PLUS',
  'FOUR_4_MINUS', 'COXED_FOUR_4_PLUS', 'QUAD_4X', 'EIGHT_8_PLUS', 'OTHER'
]);
export const weightCategorySchema = z.enum(['LIGHTWEIGHT', 'MIDWEIGHT', 'HEAVYWEIGHT']);

// Base schema without refinements (for .partial() compatibility)
const equipmentBaseSchema = z.object({
  type: equipmentTypeSchema,
  name: z.string().min(1, 'Name is required').max(100),
  manufacturer: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  yearAcquired: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  purchasePrice: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  // Shell-specific
  boatClass: boatClassSchema.optional(),
  weightCategory: weightCategorySchema.optional(),
});

// For form validation - less strict, allows empty strings that will be cleaned before API call
export const createEquipmentFormSchema = z.object({
  type: equipmentTypeSchema,
  name: z.string().min(1, 'Name is required').max(100),
  manufacturer: z.string().max(100).optional().or(z.literal('')),
  serialNumber: z.string().max(100).optional().or(z.literal('')),
  yearAcquired: z.number().int().min(1900).max(new Date().getFullYear()).optional().or(z.nan()),
  purchasePrice: z.number().positive().optional().or(z.nan()),
  notes: z.string().max(1000).optional().or(z.literal('')),
  boatClass: boatClassSchema.optional().or(z.literal('')),
  weightCategory: weightCategorySchema.optional().or(z.literal('')),
}).refine(
  (data) => data.type !== 'SHELL' || (data.boatClass !== undefined && data.boatClass !== ''),
  { message: 'Boat class required for shells', path: ['boatClass'] }
);

export const createEquipmentSchema = equipmentBaseSchema.refine(
  (data) => data.type !== 'SHELL' || (data.boatClass !== undefined),
  { message: 'Boat class required for shells', path: ['boatClass'] }
);

export const updateEquipmentSchema = equipmentBaseSchema.partial().extend({
  status: equipmentStatusSchema.optional(),
  manualUnavailable: z.boolean().optional(),
  manualUnavailableNote: z.string().max(500).optional().nullable(),
  markInspected: z.boolean().optional(),
});

export type CreateEquipmentFormInput = z.infer<typeof createEquipmentFormSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
