import { redirect } from 'next/navigation';
import { getMFAStatus } from '@/lib/actions/mfa';
import { getAuthUser } from '@/lib/auth/authorize';
import { MfaVerifyForm } from '@/components/auth/mfa-verify-form';

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const params = await searchParams;
  const redirectTo = params.redirect ?? '/admin';

  // Check MFA status
  const { hasTOTP, currentLevel } = await getMFAStatus();

  // No MFA configured - redirect to setup
  if (!hasTOTP) {
    redirect(`/mfa-setup?required=true&redirect=${encodeURIComponent(redirectTo)}`);
  }

  // Already at AAL2 - redirect to destination
  if (currentLevel === 'aal2') {
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Verify Your Identity</h1>
          <p className="mt-2 text-muted-foreground">
            Enter the code from your authenticator app to continue.
          </p>
        </div>
        <MfaVerifyForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
