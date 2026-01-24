import { Suspense } from 'react';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ApiKeyList } from './api-key-list';

export const metadata = {
  title: 'API Keys - Settings',
};

interface ApiKeysPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function ApiKeysPage({ params }: ApiKeysPageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { user, team, userRoles } = await requireTeamBySlug(teamSlug);

  // Check user has admin access
  const isAdmin = userRoles.some(r =>
    ['FACILITY_ADMIN', 'CLUB_ADMIN'].includes(r)
  );

  if (!isAdmin) {
    redirect('/unauthorized');
  }

  const clubId = team.id;

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
