import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { DamageReportForm } from '@/components/equipment/damage-report-form';

interface Props {
  params: Promise<{ equipmentId: string }>;
}

export default async function ReportDamagePage({ params }: Props) {
  const { equipmentId } = await params;

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { team: { select: { name: true, primaryColor: true, logoUrl: true } } },
  });

  if (!equipment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Team branding header */}
        <div className="text-center mb-6">
          {equipment.team.logoUrl && (
            <img
              src={equipment.team.logoUrl}
              alt=""
              className="h-12 mx-auto mb-2"
            />
          )}
          <h1
            className="text-xl font-semibold"
            style={{ color: equipment.team.primaryColor || undefined }}
          >
            {equipment.team.name}
          </h1>
        </div>

        {/* Equipment info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium">Report Damage</h2>
          <p className="text-gray-600">{equipment.name}</p>
          {equipment.manufacturer && (
            <p className="text-sm text-gray-500">{equipment.manufacturer}</p>
          )}
        </div>

        {/* Damage report form */}
        <DamageReportForm
          equipmentId={equipment.id}
          teamId={equipment.teamId}
        />
      </div>
    </div>
  );
}
