'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Start MFA enrollment for current user.
 * Returns QR code and secret for authenticator app.
 */
export async function enrollMFA() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Radl Admin TOTP',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    factorId: data.id,
    qrCode: data.totp.qr_code, // Base64 QR code image
    secret: data.totp.secret, // Manual entry backup
    uri: data.totp.uri, // Full otpauth:// URI
  };
}

/**
 * Verify TOTP code during enrollment.
 * Completes MFA setup if code is valid.
 */
export async function verifyMFAEnrollment(factorId: string, code: string) {
  const supabase = await createClient();

  // Create challenge
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    return { success: false, error: challengeError.message };
  }

  // Verify with TOTP code
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

/**
 * Verify MFA challenge for session step-up (AAL2).
 * Used when user has MFA enrolled but session is AAL1.
 */
export async function verifyMFAChallenge(code: string) {
  const supabase = await createClient();

  // Get the user's TOTP factors
  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (factorsError || !factors?.totp?.length) {
    return { success: false, error: 'No MFA factors configured' };
  }

  const factorId = factors.totp[0].id;

  // Create challenge
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    return { success: false, error: challengeError.message };
  }

  // Verify
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

/**
 * Get current MFA status for user.
 */
export async function getMFAStatus() {
  const supabase = await createClient();

  const [aalResult, factorsResult] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  return {
    currentLevel: aalResult.data?.currentLevel ?? null,
    nextLevel: aalResult.data?.nextLevel ?? null,
    hasTOTP: (factorsResult.data?.totp?.length ?? 0) > 0,
    factors: factorsResult.data?.totp ?? [],
  };
}
