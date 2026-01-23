'use client';

import { useState } from 'react';
import { X, Shield, Loader2, AlertCircle, KeyRound } from 'lucide-react';

type VerifyMode = 'totp' | 'backup';

interface MfaVerifyDialogProps {
  open: boolean;
  factorId: string;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * MFA verification dialog for login challenges.
 * Supports both TOTP codes and backup codes.
 */
export function MfaVerifyDialog({ open, factorId, onClose, onVerified }: MfaVerifyDialogProps) {
  const [mode, setMode] = useState<VerifyMode>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (mode === 'totp' && code.length !== 6) return;
    if (mode === 'backup' && code.length !== 8) return;

    setLoading(true);
    setError(null);

    try {
      const body = mode === 'totp'
        ? { factorId, code }
        : { code: code.toUpperCase() };

      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'totp' ? 'backup' : 'totp');
    setCode('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleVerify();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-100">
              Two-Factor Authentication
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {mode === 'totp' ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-zinc-300">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div>
                <label htmlFor="totp-code" className="sr-only">
                  Verification Code
                </label>
                <input
                  id="totp-code"
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
                  onKeyDown={handleKeyDown}
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                  className="block w-full text-center text-2xl tracking-widest font-mono rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-600 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-full">
                    <KeyRound className="h-8 w-8 text-amber-500" />
                  </div>
                </div>
                <p className="text-zinc-300">
                  Enter one of your 8-character backup codes.
                </p>
                <p className="text-sm text-zinc-500">
                  Each code can only be used once.
                </p>
              </div>

              <div>
                <label htmlFor="backup-code" className="sr-only">
                  Backup Code
                </label>
                <input
                  id="backup-code"
                  type="text"
                  maxLength={8}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setCode(val);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="XXXXXXXX"
                  autoFocus
                  className="block w-full text-center text-2xl tracking-widest font-mono rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 placeholder-zinc-600 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || (mode === 'totp' ? code.length !== 6 : code.length !== 8)}
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

          <div className="text-center">
            <button
              type="button"
              onClick={handleModeSwitch}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {mode === 'totp' ? 'Use a backup code instead' : 'Use authenticator app instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
