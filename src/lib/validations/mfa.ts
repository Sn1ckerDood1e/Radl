import { z } from 'zod';

/**
 * Schema for MFA enrollment request
 */
export const enrollMfaSchema = z.object({
  friendlyName: z.string().min(1).max(100).default('Authenticator App'),
});

/**
 * Schema for MFA verification (6-digit TOTP code)
 */
export const verifyMfaSchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().length(6).regex(/^\d+$/, 'Code must be 6 digits'),
});

/**
 * Schema for backup code verification (8-char alphanumeric)
 */
export const backupCodeSchema = z.object({
  code: z.string().length(8).regex(/^[A-Z0-9]+$/, 'Invalid backup code format'),
});

export type EnrollMfaInput = z.infer<typeof enrollMfaSchema>;
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
export type BackupCodeInput = z.infer<typeof backupCodeSchema>;
