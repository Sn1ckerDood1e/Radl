import { z } from 'zod';

// Enum matching Prisma schema
export const announcementPrioritySchema = z.enum(['INFO', 'WARNING', 'URGENT']);

// Create announcement schema
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  body: z.string().min(1, 'Body is required').max(1000, 'Body too long'),
  priority: announcementPrioritySchema.default('INFO'),
  practiceId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
}).refine(
  (data) => {
    if (data.expiresAt) {
      return new Date(data.expiresAt) > new Date();
    }
    return true;
  },
  { message: 'Expiry date must be in the future', path: ['expiresAt'] }
);

// Update announcement schema - all fields optional
export const updateAnnouncementSchema = createAnnouncementSchema.partial();

// Mark as read schema - empty validation
export const markAsReadSchema = z.object({});

// Type exports
export type AnnouncementPriority = z.infer<typeof announcementPrioritySchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
