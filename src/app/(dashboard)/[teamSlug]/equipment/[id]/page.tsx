import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EquipmentDetail } from '@/components/equipment/equipment-detail';
import { DamageHistory } from '@/components/equipment/damage-history';
import { UsageHistory } from '@/components/equipment/usage-history';
import { getUsageLogsForEquipment } from '@/lib/equipment/usage-logger';
import { calculateReadinessStatus } from '@/lib/equipment/readiness';
import { ReadinessBadge } from '@/components/equipment/readiness-badge';

interface EquipmentDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Fetch equipment with damage reports and settings for readiness
  const [equipment, settings] = await Promise.all([
    prisma.equipment.findFirst({
      where: {
        id,
        teamId: team.id,
      },
      include: {
        damageReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.teamSettings.findUnique({
      where: { teamId: team.id },
      select: {
        readinessInspectSoonDays: true,
        readinessNeedsAttentionDays: true,
        readinessOutOfServiceDays: true,
      },
    }),
  ]);

  if (!equipment) {
    notFound();
  }

  // Calculate readiness status
  const thresholds = {
    inspectSoonDays: settings?.readinessInspectSoonDays ?? 14,
    needsAttentionDays: settings?.readinessNeedsAttentionDays ?? 21,
    outOfServiceDays: settings?.readinessOutOfServiceDays ?? 30,
  };

  const readiness = calculateReadinessStatus({
    manualUnavailable: equipment.manualUnavailable,
    manualUnavailableNote: equipment.manualUnavailableNote,
    lastInspectedAt: equipment.lastInspectedAt,
    damageReports: equipment.damageReports.filter(r => r.status === 'OPEN').map(r => ({
      id: r.id,
      severity: r.severity,
      status: r.status,
      location: r.location,
    })),
  }, thresholds);

  // Fetch usage history
  const usageLogs = await getUsageLogsForEquipment(equipment.id, { limit: 20 });

  // Serialize for client components
  const equipmentData = {
    id: equipment.id,
    type: equipment.type,
    name: equipment.name,
    manufacturer: equipment.manufacturer,
    serialNumber: equipment.serialNumber,
    yearAcquired: equipment.yearAcquired,
    purchasePrice: equipment.purchasePrice?.toString() ?? null,
    status: equipment.status,
    notes: equipment.notes,
    boatClass: equipment.boatClass,
    weightCategory: equipment.weightCategory,
    lastInspectedAt: equipment.lastInspectedAt?.toISOString() ?? null,
    readiness,
  };

  const damageReports = equipment.damageReports.map(r => ({
    id: r.id,
    reportedBy: r.reportedBy,
    reporterName: r.reporterName,
    location: r.location,
    description: r.description,
    severity: r.severity,
    category: r.category,
    photoUrl: r.photoUrl,
    status: r.status,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    resolvedBy: r.resolvedBy,
    createdAt: r.createdAt.toISOString(),
  }));

  // Serialize usage logs for client component
  const usageLogsData = usageLogs.map(log => ({
    id: log.id,
    usageDate: log.usageDate.toISOString(),
    practice: {
      id: log.practice.id,
      name: log.practice.name,
      date: log.practice.date.toISOString(),
    },
  }));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb and Header */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-zinc-400 mb-4">
          <li>
            <Link href={`/${teamSlug}/equipment`} className="hover:text-teal-400 transition-colors">
              Equipment
            </Link>
          </li>
          <li>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </li>
          <li className="text-white font-medium">{equipment.name}</li>
        </ol>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{equipment.name}</h1>
          <ReadinessBadge status={readiness.status} />
        </div>
      </nav>

      <div className="space-y-6">
        <EquipmentDetail
          equipment={equipmentData}
          teamSlug={teamSlug}
          isCoach={isCoach}
        />

        <UsageHistory
          usageLogs={usageLogsData}
          teamSlug={teamSlug}
        />

        <DamageHistory
          damageReports={damageReports}
          equipmentId={equipment.id}
          isCoach={isCoach}
        />
      </div>
    </div>
  );
}
