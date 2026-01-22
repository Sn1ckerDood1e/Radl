import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EquipmentDetail } from '@/components/equipment/equipment-detail';
import { DamageHistory } from '@/components/equipment/damage-history';
import { UsageHistory } from '@/components/equipment/usage-history';
import { getUsageLogsForEquipment } from '@/lib/equipment/usage-logger';

interface EquipmentDetailPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has team access
  const { claims } = await requireTeam();

  if (!claims.team_id) {
    notFound();
  }

  // Get team to verify slug matches
  const team = await prisma.team.findUnique({
    where: { id: claims.team_id },
    select: { id: true, slug: true },
  });

  if (!team || team.slug !== teamSlug) {
    notFound();
  }

  // Fetch equipment with damage reports
  const equipment = await prisma.equipment.findFirst({
    where: {
      id,
      teamId: claims.team_id,
    },
    include: {
      damageReports: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!equipment) {
    notFound();
  }

  const isCoach = claims.user_role === 'COACH';

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
  };

  const damageReports = equipment.damageReports.map(r => ({
    id: r.id,
    reportedBy: r.reportedBy,
    location: r.location,
    description: r.description,
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
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-zinc-400">
          <li>
            <Link href={`/${teamSlug}/equipment`} className="hover:text-emerald-400 transition-colors">
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
