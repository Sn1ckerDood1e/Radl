import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { getCurrentClubId } from '@/lib/auth/club-context';
import { MfaSection } from '@/components/settings/mfa-section';
import { PermissionGrantsSection } from '@/components/settings/permission-grants-section';

export const metadata = {
  title: 'Security Settings - RowOps',
};

function LoadingSkeleton() {
  return (
    <div className="bg-[var(--surface-2)] rounded-lg p-6 border border-[var(--border)]">
      <div className="animate-pulse">
        <div className="h-6 bg-[var(--surface-1)] rounded w-1/4 mb-4" />
        <div className="h-4 bg-[var(--surface-1)] rounded w-1/2 mb-6" />
        <div className="h-32 bg-[var(--surface-1)] rounded" />
      </div>
    </div>
  );
}

export default async function SecuritySettingsPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  const { user, claims } = await requireTeam();

  const clubId = await getCurrentClubId() || claims.team_id;
  if (!clubId) redirect('/');

  // Get user's membership to check roles
  const membership = await prisma.clubMembership.findFirst({
    where: {
      clubId,
      userId: user.id,
      isActive: true,
    },
  });

  const isAdmin = membership?.roles.some(r =>
    ['FACILITY_ADMIN', 'CLUB_ADMIN'].includes(r)
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header with back link */}
      <div className="mb-8">
        <Link
          href={`/${teamSlug}/settings`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Security Settings
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage two-factor authentication and security preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* MFA Section - available to all authenticated users */}
        <Suspense fallback={<LoadingSkeleton />}>
          <MfaSection />
        </Suspense>

        {/* Permission Grants Section - only for admins */}
        {isAdmin && (
          <Suspense fallback={<LoadingSkeleton />}>
            <PermissionGrantsSection />
          </Suspense>
        )}
      </div>
    </div>
  );
}
