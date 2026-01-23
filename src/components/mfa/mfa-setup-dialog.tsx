'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Shield, Smartphone, KeyRound, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { BackupCodesDisplay } from './backup-codes-display';

type SetupStep = 'intro' | 'qr' | 'verify' | 'backup' | 'complete';

interface EnrollmentData {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
  backupCodes: string[];
}

interface MfaSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

/**
 * Multi-step MFA enrollment dialog.
 * Flow: intro -> qr -> verify -> backup -> complete
 */
export function MfaSetupDialog({ open, onClose, onComplete }: MfaSetupDialogProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog closes
  const handleClose = () => {
    if (step !== 'backup' && step !== 'verify') {
      setStep('intro');
      setEnrollmentData(null);
      setCode('');
      setError(null);
      setLoading(false);
      onClose();
    }
  };

  // Step 1 -> Step 2: Start enrollment
  const handleStartEnrollment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendlyName: 'Authenticator App' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start enrollment');
      }

      setEnrollmentData(data);
      setStep('qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Show verify screen
  const handleQrScanned = () => {
    setStep('verify');
  };

  // Step 3 -> Step 4: Verify code
  const handleVerifyCode = async () => {
    if (!enrollmentData || code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: enrollmentData.id,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 -> Step 5: Complete setup
  const handleBackupCodesSaved = () => {
    setStep('complete');
  };

  // Step 5: Done
  const handleDone = () => {
    setStep('intro');
    setEnrollmentData(null);
    setCode('');
    setError(null);
    onComplete?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">
            {step === 'intro' && 'Set Up Two-Factor Authentication'}
            {step === 'qr' && 'Scan QR Code'}
            {step === 'verify' && 'Verify Code'}
            {step === 'backup' && 'Save Backup Codes'}
            {step === 'complete' && 'Setup Complete'}
          </h2>
          {step !== 'backup' && step !== 'verify' && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Step 1: Intro */}
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-500/10 rounded-full">
                  <Shield className="h-12 w-12 text-emerald-500" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-zinc-300">
                  Add an extra layer of security to your account by requiring a code from your
                  authenticator app when you sign in.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <Smartphone className="h-5 w-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Authenticator App Required</p>
                    <p className="text-sm text-zinc-400">
                      You'll need an app like Google Authenticator, Authy, or 1Password.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <KeyRound className="h-5 w-5 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Backup Codes</p>
                    <p className="text-sm text-zinc-400">
                      You'll receive 10 backup codes in case you lose your device.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartEnrollment}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          )}

          {/* Step 2: QR Code */}
          {step === 'qr' && enrollmentData && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-zinc-300">
                  Scan this QR code with your authenticator app.
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={enrollmentData.totp.uri}
                    size={180}
                    level="M"
                  />
                </div>
              </div>

              {/* Manual entry fallback */}
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 text-center">
                  Can't scan? Enter this code manually:
                </p>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                  <code className="text-sm text-zinc-200 break-all font-mono">
                    {enrollmentData.totp.secret}
                  </code>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQrScanned}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 transition-colors"
              >
                I've scanned the code
              </button>
            </div>
          )}

          {/* Step 3: Verify */}
          {step === 'verify' && enrollmentData && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-zinc-300">
                  Enter the 6-digit code from your authenticator app to verify setup.
                </p>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-2">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCode(val);
                    setError(null);
                  }}
                  placeholder="000000"
                  autoFocus
                  className="block w-full text-center text-2xl tracking-widest font-mono rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-600 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('qr')}
                className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Go back to QR code
              </button>
            </div>
          )}

          {/* Step 4: Backup Codes */}
          {step === 'backup' && enrollmentData && (
            <BackupCodesDisplay
              codes={enrollmentData.backupCodes}
              onDone={handleBackupCodesSaved}
            />
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-500/10 rounded-full">
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-zinc-100">
                  Two-Factor Authentication Enabled
                </h3>
                <p className="text-zinc-400">
                  Your account is now protected with an additional layer of security.
                  You'll be asked for a code from your authenticator app when signing in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDone}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {step !== 'intro' && step !== 'complete' && (
          <div className="px-6 pb-4">
            <div className="flex gap-1">
              {['qr', 'verify', 'backup'].map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    ['qr', 'verify', 'backup'].indexOf(step) >= i
                      ? 'bg-emerald-500'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
