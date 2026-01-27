import { z } from 'zod';

// Enums matching Prisma schema
export const workoutTypeSchema = z.enum([
  'SINGLE_TIME',
  'SINGLE_DISTANCE',
  'INTERVALS',
  'VARIABLE_INTERVALS'
]);

// Single interval schema with PM5 constraints
export const workoutIntervalSchema = z.object({
  durationType: z.enum(['time', 'distance']),
  duration: z.number().int().positive(),
  targetSplit: z.string().regex(/^\d:\d{2}\.\d$/).optional(), // "2:05.0" format
  targetStrokeRate: z.number().int().min(16).max(40).optional(),
  restDuration: z.number().int().min(0).default(0),
  restType: z.enum(['time', 'undefined']).default('time'),
});

// Create workout schema (max 50 intervals per PM5 limit)
export const createWorkoutSchema = z.object({
  type: workoutTypeSchema,
  notes: z.string().max(500).optional(),
  visibleToAthletes: z.boolean().default(true),
  intervals: z.array(workoutIntervalSchema)
    .min(1, 'At least one interval required')
    .max(50, 'Maximum 50 intervals (PM5 limit)'),
}).refine(data => {
  // Auto-detect variable intervals: different durations require VARIABLE_INTERVALS type
  if (data.intervals.length > 1 && data.type !== 'VARIABLE_INTERVALS') {
    const firstDuration = data.intervals[0].duration;
    const hasVariableDurations = data.intervals.some(i => i.duration !== firstDuration);
    if (hasVariableDurations) return false;
  }
  return true;
}, {
  message: 'Intervals with different durations require VARIABLE_INTERVALS type',
  path: ['type']
});

// Update workout schema (partial)
export const updateWorkoutSchema = createWorkoutSchema.partial();

// Workout template schemas
export const createWorkoutTemplateSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  type: workoutTypeSchema,
  notes: z.string().max(500).optional(),
  intervals: z.array(workoutIntervalSchema)
    .min(1)
    .max(50),
});

export const updateWorkoutTemplateSchema = createWorkoutTemplateSchema.partial();

// Type exports
export type WorkoutType = z.infer<typeof workoutTypeSchema>;
export type WorkoutInterval = z.infer<typeof workoutIntervalSchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type CreateWorkoutTemplateInput = z.infer<typeof createWorkoutTemplateSchema>;
export type UpdateWorkoutTemplateInput = z.infer<typeof updateWorkoutTemplateSchema>;
