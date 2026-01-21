'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console (could send to error tracking service)
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">Oops!</h1>
          <h2 className="text-xl text-gray-600 mb-2">Something went wrong</h2>
          <p className="text-gray-500">
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        {error.digest && (
          <p className="text-sm text-gray-400 mb-6">
            Error Reference: <code className="bg-gray-100 px-2 py-1 rounded">{error.digest}</code>
          </p>
        )}

        <div className="space-y-4">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
