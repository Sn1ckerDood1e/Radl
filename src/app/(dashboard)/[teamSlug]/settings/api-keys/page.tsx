import { Suspense } from 'react';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { getCurrentClubId } from '@/lib/auth/club-context';
import { redirect } from 'next/navigation';
import { ApiKeyList } from './api-key-list';

export const metadata = {
  title: 'API Keys - Settings',
};

export default async function ApiKeysPage() {
  const { user, claims } = await requireTeam();

  const clubId = await getCurrentClubId() || claims.team_id;
  if (!clubId) redirect('/');

  // Check user has admin access
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

  if (!isAdmin) {
    redirect('/unauthorized');
  }

  // Get existing API keys
  const apiKeysRaw = await prisma.apiKey.findMany({
    where: {
      clubId,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdBy: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize dates for client component
  const apiKeys = apiKeysRaw.map(key => ({
    ...key,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          API Keys
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage API keys for external integrations. Keys provide the same access as the user who created them.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse h-48 bg-[var(--surface-2)] rounded-lg" />}>
        <ApiKeyList initialKeys={apiKeys} />
      </Suspense>
    </div>
  );
}
