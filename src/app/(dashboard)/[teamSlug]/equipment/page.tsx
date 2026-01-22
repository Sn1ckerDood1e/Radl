import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EquipmentListClient } from './equipment-list-client';
import { EquipmentUsageSummary } from '@/components/equipment/equipment-usage-summary';

interface EquipmentPageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function EquipmentPage({ params }: EquipmentPageProps) {
  const { teamSlug } = await params;

  // Verify user has a team
  const { claims } = await requireTeam();

  if (!claims.team_id) {
    redirect('/create-team');
  }

  // Get team info
  const team = await prisma.team.findUnique({
    where: { id: claims.team_id },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!team || team.slug !== teamSlug) {
    redirect('/create-team');
  }

  // Get all equipment for the team
  const equipment = await prisma.equipment.findMany({
    where: { teamId: team.id },
    orderBy: [
      { type: 'asc' },
      { name: 'asc' },
    ],
  });

  // Get usage summary data
  const usageLogs = await prisma.equipmentUsageLog.findMany({
    where: { teamId: team.id },
    include: {
      equipment: { select: { id: true, name: true } },
      practice: { select: { id: true, name: true } },
    },
    orderBy: { usageDate: 'desc' },
    take: 100, // Get enough to compute summary
  });

  // Compute most used equipment
  const usageCounts = new Map<string, { name: string; count: number; lastUsed: Date | null }>();
  for (const log of usageLogs) {
    const existing = usageCounts.get(log.equipmentId);
    if (existing) {
      existing.count++;
    } else {
      usageCounts.set(log.equipmentId, {
        name: log.equipment.name,
        count: 1,
        lastUsed: log.usageDate,
      });
    }
  }

  const mostUsed = Array.from(usageCounts.entries())
    .map(([equipmentId, data]) => ({
      equipmentId,
      equipmentName: data.name,
      usageCount: data.count,
      lastUsed: data.lastUsed?.toISOString() ?? null,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);

  // Get recent usage (last 5 unique equipment uses)
  const recentUsage = usageLogs.slice(0, 5).map(log => ({
    id: log.id,
    equipmentId: log.equipmentId,
    equipmentName: log.equipment.name,
    practiceName: log.practice.name,
    practiceId: log.practiceId,
    usageDate: log.usageDate.toISOString(),
  }));

  const isCoach = claims.user_role === 'COACH';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/${teamSlug}`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-white">Equipment</h1>
          </div>
          <p className="text-zinc-400">
            Manage {team.name}&apos;s shells, oars, and launches
          </p>
        </div>
        {isCoach && (
          <Link
            href={`/${teamSlug}/equipment/new`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Equipment
          </Link>
        )}
      </div>

      <EquipmentUsageSummary
        mostUsed={mostUsed}
        recentUsage={recentUsage}
        teamSlug={teamSlug}
      />

      <EquipmentListClient
        equipment={equipment.map(e => ({
          id: e.id,
          type: e.type,
          name: e.name,
          manufacturer: e.manufacturer,
          status: e.status,
          boatClass: e.boatClass,
        }))}
        teamSlug={teamSlug}
        isCoach={isCoach}
      />
    </div>
  );
}
