'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { enrollMFA, verifyMFAEnrollment } from '@/lib/actions/mfa';

interface MfaSetupFormProps {
  redirectTo: string;
}

type Stage = 'initial' | 'scan' | 'done';

export function MfaSetupForm({ redirectTo }: MfaSetupFormProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const handleStartEnrollment = async () => {
    setLoading(true);
    setError(null);

    const result = await enrollMFA();

    if (!result.success) {
      setError(result.error ?? 'Failed to start enrollment');
      setLoading(false);
      return;
    }

    setEnrollmentData({
      factorId: result.factorId!,
      qrCode: result.qrCode!,
      secret: result.secret!,
    });
    setStage('scan');
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentData) return;

    setLoading(true);
    setError(null);

    const result = await verifyMFAEnrollment(enrollmentData.factorId, code);

    if (!result.success) {
      setError(result.error ?? 'Invalid code');
      setLoading(false);
      return;
    }

    setStage('done');
    // Redirect after short delay to show success
    setTimeout(() => router.push(redirectTo), 1500);
  };

  const copySecret = async () => {
    if (enrollmentData?.secret) {
      await navigator.clipboard.writeText(enrollmentData.secret);
    }
  };

  // Stage 1: Initial - Button to start enrollment
  if (stage === 'initial') {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="space-y-4">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              Protect your account
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Use an authenticator app like Google Authenticator or 1Password to generate verification codes.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Button
            type="button"
            onClick={handleStartEnrollment}
            loading={loading}
            className="w-full"
          >
            Set up authenticator
          </Button>
        </div>
      </div>
    );
  }

  // Stage 2: Scan - Show QR code and ask for verification code
  if (stage === 'scan' && enrollmentData) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">
              Scan QR code
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Scan this QR code with your authenticator app
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <img
              src={enrollmentData.qrCode}
              alt="QR code for authenticator app"
              className="w-48 h-48 border border-gray-200 rounded-lg"
            />
          </div>

          {/* Manual entry option */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="w-full text-sm text-blue-600 hover:text-blue-500"
            >
              {showSecret ? 'Hide manual entry key' : "Can't scan? Enter key manually"}
            </button>

            {showSecret && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Secret key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Verification form */}
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Enter verification code
              </label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={code.length !== 6}
            >
              Verify and enable
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Stage 3: Done - Success message
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          Two-factor authentication enabled
        </h3>
        <p className="text-sm text-gray-500">
          Your account is now protected with an authenticator app.
        </p>
        <p className="text-sm text-gray-400">
          Redirecting...
        </p>
      </div>
    </div>
  );
}
