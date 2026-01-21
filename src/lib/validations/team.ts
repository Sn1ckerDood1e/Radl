import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(50, 'Team name must be at most 50 characters'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  // Logo is handled separately as file upload
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
