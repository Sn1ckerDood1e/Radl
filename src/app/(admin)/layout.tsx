import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { requireSuperAdmin } from '@/lib/auth/admin-authorize';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSessionTimeout } from '@/components/admin/admin-session-timeout';
import { AbilityProvider } from '@/components/permissions/ability-provider';
import type { UserContext } from '@/lib/permissions/ability';

/**
 * Admin layout with super admin and MFA verification.
 *
 * Security flow:
 * 1. Database-verified super admin status (not JWT claims)
 * 2. MFA enrollment check - redirect to /mfa-setup if no TOTP enrolled
 * 3. AAL level check - redirect to /mfa-verify if AAL1 but MFA enrolled
 *
 * Super admins get can('manage', 'all') via CASL.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify super admin status (database-verified)
  const user = await requireSuperAdmin();

  // 2. Verify MFA enrollment and session level
  const supabase = await createClient();
  const [aalResult, factorsResult] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  const hasTOTP = (factorsResult.data?.totp?.length ?? 0) > 0;
  const currentLevel = aalResult.data?.currentLevel;
  const nextLevel = aalResult.data?.nextLevel;

  // No MFA configured - must set up
  if (!hasTOTP) {
    redirect('/mfa-setup?required=admin');
  }

  // MFA enrolled but session is AAL1 - must verify
  if (currentLevel !== 'aal2' && nextLevel === 'aal2') {
    redirect('/mfa-verify?redirect=/admin');
  }

  // 3. Build admin context for CASL
  const adminContext: UserContext = {
    userId: user.id,
    clubId: '',  // No club context in admin
    roles: [],   // No tenant roles
    viewMode: null,
    isSuperAdmin: true,
  };

  // Get user email for header display
  const { data: { user: authUser } } = await supabase.auth.getUser();

  return (
    <AbilityProvider user={adminContext}>
      <Toaster position="top-right" richColors />
      <AdminSessionTimeout />
      <div className="min-h-screen bg-[var(--background)]">
        <AdminHeader userEmail={authUser?.email ?? 'Admin'} />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AbilityProvider>
  );
}
