import { redirect } from 'next/navigation';
import { getMFAStatus } from '@/lib/actions/mfa';
import { getAuthUser } from '@/lib/auth/authorize';
import { MfaSetupForm } from '@/components/auth/mfa-setup-form';

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string; redirect?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const isRequired = params.required === 'true' || params.required === 'admin';
  const redirectTo = params.redirect ?? '/admin';

  // Check if already enrolled
  const { hasTOTP } = await getMFAStatus();
  if (hasTOTP) {
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set Up Two-Factor Authentication</h1>
          {isRequired && (
            <p className="mt-2 text-muted-foreground">
              Two-factor authentication is required for admin access.
            </p>
          )}
        </div>
        <MfaSetupForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
