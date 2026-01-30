'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, AlertTriangle, Key, RefreshCw, Loader2, Copy, Check } from 'lucide-react';
import { BackupCodesDisplay } from '@/components/mfa/backup-codes-display';

interface MfaFactor {
  id: string;
  friendlyName: string | null;
  factorType: string;
  status: string;
}

interface MfaStatus {
  currentLevel: 'aal1' | 'aal2';
  needsMfaVerification: boolean;
  factors: MfaFactor[];
  remainingBackupCodes: number;
}

interface EnrollmentData {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
  backupCodes: string[];
}

type SetupStep = 'idle' | 'scanning' | 'verifying' | 'backup-codes' | 'complete';

/**
 * MFA management section for user security settings.
 * Allows users to enable/disable MFA and regenerate backup codes.
 */
export function MfaSection() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enrollment state
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Backup codes regeneration
  const [regenerating, setRegenerating] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  // Disable MFA state
  const [disabling, setDisabling] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Secret copying
  const [secretCopied, setSecretCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/mfa/factors');
      if (!response.ok) {
        throw new Error('Failed to fetch MFA status');
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartEnrollment = async () => {
    setError(null);
    setSetupStep('scanning');

    try {
      const response = await fetch('/api/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendlyName: 'Authenticator App' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start MFA enrollment');
      }

      const data = await response.json();
      setEnrollmentData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment');
      setSetupStep('idle');
    }
  };

  const handleVerifyCode = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: enrollmentData.id,
          code: verifyCode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      setSetupStep('backup-codes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleCompleteSetup = () => {
    setSetupStep('complete');
    setEnrollmentData(null);
    setVerifyCode('');
    fetchStatus();
    // Reset to idle after showing success
    setTimeout(() => setSetupStep('idle'), 2000);
  };

  const handleCancelSetup = () => {
    setSetupStep('idle');
    setEnrollmentData(null);
    setVerifyCode('');
    setError(null);
  };

  const handleCopySecret = async () => {
    if (!enrollmentData) return;
    await navigator.clipboard.writeText(enrollmentData.totp.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleRegenerateBackupCodes = async () => {
    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/backup-codes', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate backup codes');
      }

      const data = await response.json();
      setNewBackupCodes(data.backupCodes);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!status?.factors[0]) return;

    setDisabling(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/unenroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: status.factors[0].id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disable MFA');
      }

      setShowDisableConfirm(false);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--surface-2)] rounded-lg p-6 border border-[var(--border)]">
        <div className="animate-pulse">
          <div className="h-6 bg-[var(--surface-1)] rounded w-1/4 mb-4" />
          <div className="h-4 bg-[var(--surface-1)] rounded w-1/2 mb-6" />
          <div className="h-24 bg-[var(--surface-1)] rounded" />
        </div>
      </div>
    );
  }

  const isEnabled = status?.factors.some(f => f.status === 'verified');

  return (
    <div className="bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-teal-500" />
              </div>
            ) : (
              <div className="p-2 bg-zinc-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-zinc-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {isEnabled
                  ? 'Your account is protected with 2FA'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>

          {isEnabled && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/10 text-teal-400">
              Enabled
            </span>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Content based on state */}
      <div className="p-6">
        {/* Setup Step: Scanning QR Code */}
        {setupStep === 'scanning' && enrollmentData && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">
                Scan QR Code
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                Open your authenticator app and scan this QR code
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div
                className="bg-white p-4 rounded-lg"
                dangerouslySetInnerHTML={{ __html: enrollmentData.totp.qr_code }}
              />
            </div>

            {/* Manual entry option */}
            <div className="p-4 bg-[var(--surface-1)] rounded-lg">
              <p className="text-xs text-[var(--text-muted)] mb-2">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-[var(--text-primary)] bg-[var(--surface-2)] px-3 py-2 rounded border border-[var(--border)]">
                  {enrollmentData.totp.secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4 text-teal-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Verification code input */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Enter verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-[var(--surface-1)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelSetup}
                className="flex-1 px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-1)] border border-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verifyCode.length !== 6 || verifying}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              >
                {verifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Setup Step: Backup Codes */}
        {setupStep === 'backup-codes' && enrollmentData && (
          <BackupCodesDisplay
            codes={enrollmentData.backupCodes}
            onDone={handleCompleteSetup}
          />
        )}

        {/* Setup Step: Complete */}
        {setupStep === 'complete' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/10 rounded-full mb-4">
              <ShieldCheck className="h-8 w-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">
              Two-factor authentication enabled
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Your account is now more secure
            </p>
          </div>
        )}

        {/* Default state: Show enable button or management options */}
        {setupStep === 'idle' && (
          <>
            {!isEnabled ? (
              /* Enable MFA */
              <div className="text-center py-4">
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Use an authenticator app like Google Authenticator, Authy, or 1Password to generate one-time codes.
                </p>
                <button
                  onClick={handleStartEnrollment}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[var(--accent)] rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Shield className="h-4 w-4" />
                  Enable Two-Factor Authentication
                </button>
              </div>
            ) : (
              /* MFA Management */
              <div className="space-y-4">
                {/* Backup codes status */}
                <div className="flex items-center justify-between p-4 bg-[var(--surface-1)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-[var(--text-muted)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Backup Codes
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {status?.remainingBackupCodes ?? 0} codes remaining
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRegenerateBackupCodes}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-1)] disabled:opacity-50 transition-colors"
                  >
                    {regenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Regenerate
                  </button>
                </div>

                {/* Warning if low backup codes */}
                {status && status.remainingBackupCodes < 3 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
                    <p className="text-sm text-amber-400">
                      You're running low on backup codes. Consider regenerating them now.
                    </p>
                  </div>
                )}

                {/* New backup codes display */}
                {newBackupCodes && (
                  <div className="mt-4">
                    <BackupCodesDisplay
                      codes={newBackupCodes}
                      onDone={() => setNewBackupCodes(null)}
                    />
                  </div>
                )}

                {/* Disable MFA */}
                {!showDisableConfirm ? (
                  <button
                    onClick={() => setShowDisableConfirm(true)}
                    className="w-full mt-4 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Disable Two-Factor Authentication
                  </button>
                ) : (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400 mb-3">
                      Are you sure you want to disable 2FA? This will make your account less secure.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDisableConfirm(false)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] bg-[var(--surface-1)] border border-[var(--border)] rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDisableMfa}
                        disabled={disabling}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50"
                      >
                        {disabling ? 'Disabling...' : 'Yes, Disable'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
