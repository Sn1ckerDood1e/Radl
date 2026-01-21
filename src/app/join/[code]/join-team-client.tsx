'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinTeamClientProps {
  teamCode: string;
  teamName: string;
}

export function JoinTeamClient({ teamCode, teamName }: JoinTeamClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; slug?: string; requiresApproval: boolean } | null>(null);
  const [role, setRole] = useState<'ATHLETE' | 'PARENT'>('ATHLETE');

  const handleJoin = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamCode,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join team');
      }

      setSuccess({
        message: result.message,
        slug: result.team?.slug,
        requiresApproval: result.requiresApproval,
      });

      // If auto-approved (email invite), redirect after a short delay
      if (!result.requiresApproval && result.team?.slug) {
        setTimeout(() => {
          router.push(`/${result.team.slug}`);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
          success.requiresApproval ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
        }`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {success.requiresApproval ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            )}
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {success.requiresApproval ? 'Request Submitted!' : 'Welcome!'}
        </h2>
        <p className="text-gray-600">{success.message}</p>
        {!success.requiresApproval && success.slug && (
          <p className="text-sm text-gray-500 mt-2">Redirecting to your team dashboard...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <p className="text-gray-600 text-center">
        You&apos;re about to request to join <strong>{teamName}</strong>.
        A coach will review and approve your request.
      </p>

      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          I am joining as:
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRole('ATHLETE')}
            className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
              role === 'ATHLETE'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Athlete
          </button>
          <button
            type="button"
            onClick={() => setRole('PARENT')}
            className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-colors ${
              role === 'PARENT'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Parent
          </button>
        </div>
      </div>

      <button
        onClick={handleJoin}
        disabled={isSubmitting}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting Request...' : 'Request to Join'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Note: Team code joins require coach approval.
      </p>
    </div>
  );
}
