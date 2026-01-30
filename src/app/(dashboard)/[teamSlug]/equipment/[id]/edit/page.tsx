import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { EquipmentForm } from '@/components/equipment/equipment-form';

interface EditEquipmentPageProps {
  params: Promise<{ teamSlug: string; id: string }>;
}

export default async function EditEquipmentPage({ params }: EditEquipmentPageProps) {
  const { teamSlug, id } = await params;

  // Verify user has membership in this team
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Only coaches can edit equipment
  if (!isCoach) {
    redirect(`/${teamSlug}/equipment/${id}`);
  }

  // Fetch the equipment
  const equipment = await prisma.equipment.findFirst({
    where: {
      id,
      teamId: team.id,
    },
    select: {
      id: true,
      type: true,
      name: true,
      manufacturer: true,
      serialNumber: true,
      yearAcquired: true,
      purchasePrice: true,
      notes: true,
      boatClass: true,
      weightCategory: true,
    },
  });

  if (!equipment) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}/equipment`} className="hover:text-teal-400 transition-colors">
              Equipment
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/${teamSlug}/equipment/${id}`} className="hover:text-teal-400 transition-colors">
              {equipment.name}
            </Link>
          </li>
          <li>/</li>
          <li className="text-white">Edit</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Edit Equipment</h1>
        <p className="text-zinc-400 mt-1">
          Update details for {equipment.name}.
        </p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <EquipmentForm teamSlug={teamSlug} equipment={equipment} />
      </div>
    </div>
  );
}
