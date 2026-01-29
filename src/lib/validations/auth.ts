import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address (e.g., you@example.com)'),
  password: z.string()
    .min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address (e.g., you@example.com)'),
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please re-enter your password.",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
