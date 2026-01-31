'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyMFAChallenge } from '@/lib/actions/mfa';

interface MfaVerifyFormProps {
  redirectTo: string;
}

export function MfaVerifyForm({ redirectTo }: MfaVerifyFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await verifyMFAChallenge(code);

    if (!result.success) {
      setError(result.error ?? 'Verification failed');
      setLoading(false);
      return;
    }

    router.push(redirectTo);
  };

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
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            Enter Verification Code
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Input
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

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={code.length !== 6}
          >
            Verify
          </Button>
        </form>
      </div>
    </div>
  );
}
