'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';

// Validate redirect is a relative path to prevent open redirect attacks
function isValidRedirect(redirect: string | null): redirect is string {
  if (!redirect) return false;
  // Must start with / and not be a protocol-relative URL (//)
  return redirect.startsWith('/') && !redirect.startsWith('//');
}

// Loading fallback for Suspense boundary
function SignupLoading() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        Create your account
      </h2>
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-blue-200 rounded" />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const redirect = isValidRedirect(redirectParam) ? redirectParam : null;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          ...(redirect && { redirectTo: redirect }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          setError(`Too many attempts. Please try again in ${retryAfter || '60'} seconds.`);
          return;
        }
        setError(result.error || 'Signup failed');
        return;
      }

      setSuccess(true);
    } catch {
      setError('An unexpected error occurred');
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h2>
        <p className="text-gray-600 mb-4">
          We&apos;ve sent you a confirmation link. Please check your email to verify your account.
        </p>
        {redirect && (
          <p className="text-gray-500 text-sm mb-4">
            After verification, you&apos;ll be redirected to complete your action.
          </p>
        )}
        <Link
          href="/login"
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        Create your account
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            {...register('password')}
            type="password"
            id="password"
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            {...register('confirmPassword')}
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full"
        >
          Sign up
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
