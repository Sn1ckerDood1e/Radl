import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ATHLETE', 'PARENT']),
  athleteId: z.string().uuid().optional(), // Required if role is PARENT
}).refine(
  (data) => data.role !== 'PARENT' || data.athleteId,
  { message: 'athleteId required for parent invitations', path: ['athleteId'] }
);

export const bulkInviteSchema = z.object({
  invitations: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['ATHLETE', 'PARENT']).default('ATHLETE'),
  })),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
