import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';

/**
 * MFA enrollment result with QR code and backup codes
 */
export interface MfaEnrollmentResult {
  id: string;
  totp: {
    qr_code: string;  // SVG from Supabase
    secret: string;   // Manual entry secret
    uri: string;      // otpauth:// URI
  };
  backupCodes: string[];  // 10 one-time backup codes
}

/**
 * Enroll user in MFA with TOTP factor.
 * Returns QR code, secret, and generates 10 backup codes.
 */
export async function enrollMfa(friendlyName: string): Promise<MfaEnrollmentResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });

  if (error) throw error;
  if (!data.totp) throw new Error('TOTP data not returned');

  // Get user for backup code generation
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Generate and store backup codes
  const backupCodes = await generateAndStoreBackupCodes(user.id);

  return {
    id: data.id,
    totp: {
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
    backupCodes,
  };
}

/**
 * Challenge and verify MFA code in one flow.
 * Returns refreshed session on success.
 */
export async function verifyMfaCode(factorId: string, code: string) {
  const supabase = await createClient();

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (error) throw error;
  return data; // Session refreshed with aal2
}

/**
 * MFA status result
 */
export interface MfaStatus {
  currentLevel: 'aal1' | 'aal2';
  nextLevel: 'aal1' | 'aal2' | null;
  needsMfaVerification: boolean;
  factors: Array<{
    id: string;
    friendlyName: string | null;
    factorType: string;
    status: string;
  }>;
}

/**
 * Get current MFA status including enrolled factors.
 */
export async function getMfaStatus(): Promise<MfaStatus> {
  const supabase = await createClient();

  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) throw aalError;

  const { data: factorsData, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (factorsError) throw factorsError;

  return {
    currentLevel: aalData.currentLevel as 'aal1' | 'aal2',
    nextLevel: aalData.nextLevel as 'aal1' | 'aal2' | null,
    needsMfaVerification: aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2',
    factors: (factorsData?.totp || []).map(f => ({
      id: f.id,
      friendlyName: f.friendly_name ?? null,
      factorType: f.factor_type,
      status: f.status,
    })),
  };
}

/**
 * Unenroll MFA factor. Requires verification first.
 */
export async function unenrollMfa(factorId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;

  // Clean up backup codes
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await prisma.mfaBackupCode.deleteMany({
      where: { userId: user.id },
    });
  }
}

/**
 * Generate 10 backup codes and store hashes in database.
 * Returns plaintext codes (only shown once).
 */
async function generateAndStoreBackupCodes(userId: string): Promise<string[]> {
  // Delete any existing backup codes
  await prisma.mfaBackupCode.deleteMany({
    where: { userId },
  });

  const codes: string[] = [];
  const records: { userId: string; codeHash: string }[] = [];

  for (let i = 0; i < 10; i++) {
    // 8 bytes = 16 hex chars, take first 8, uppercase
    const code = randomBytes(8).toString('hex').substring(0, 8).toUpperCase();
    const hash = createHash('sha256').update(code).digest('hex');

    codes.push(code);
    records.push({ userId, codeHash: hash });
  }

  await prisma.mfaBackupCode.createMany({
    data: records,
  });

  return codes;
}

/**
 * Verify and consume a backup code.
 * Returns true if valid and consumed, false if invalid or already used.
 */
export async function useBackupCode(userId: string, code: string): Promise<boolean> {
  const hash = createHash('sha256').update(code.toUpperCase()).digest('hex');

  const backupCode = await prisma.mfaBackupCode.findFirst({
    where: {
      userId,
      codeHash: hash,
      usedAt: null,
    },
  });

  if (!backupCode) return false;

  await prisma.mfaBackupCode.update({
    where: { id: backupCode.id },
    data: { usedAt: new Date() },
  });

  return true;
}

/**
 * Get remaining unused backup codes count for a user.
 */
export async function getRemainingBackupCodesCount(userId: string): Promise<number> {
  return prisma.mfaBackupCode.count({
    where: {
      userId,
      usedAt: null,
    },
  });
}

/**
 * Regenerate backup codes (deletes old ones, creates new).
 * User must be authenticated.
 */
export async function regenerateBackupCodes(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  return generateAndStoreBackupCodes(user.id);
}
