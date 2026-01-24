import Link from 'next/link';
import { requireTeamBySlug } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { Plus, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface PageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function LineupTemplatesPage({ params }: PageProps) {
  const { teamSlug } = await params;

  // Verify user has membership in this team (by URL slug, not JWT claims)
  const { team, isCoach } = await requireTeamBySlug(teamSlug);

  // Fetch lineup templates
  const templates = await prisma.lineupTemplate.findMany({
    where: { teamId: team.id },
    include: {
      _count: { select: { seats: true } },
      defaultBoat: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-zinc-400">
          <li>
            <Link href={`/${teamSlug}`} className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li className="text-white">Lineup Templates</li>
        </ol>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Lineup Templates</h1>
          <p className="text-zinc-400 mt-1">
            Save and reuse lineup configurations
          </p>
        </div>
        {isCoach && (
          <Link
            href={`/${teamSlug}/practices`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create from Practice
          </Link>
        )}
      </div>

      {/* Templates list */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Link
              key={template.id}
              href={`/${teamSlug}/lineup-templates/${template.id}`}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            >
              <h3 className="font-medium text-zinc-200">{template.name}</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {template.boatClass.replace(/_/g, ' ')} - {template._count.seats} seats
              </p>
              {template.defaultBoat && (
                <p className="text-sm text-zinc-600 mt-1">
                  Default boat: {template.defaultBoat.name}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <EmptyState
            icon={Users}
            title="No lineup templates yet"
            description="Save a lineup from a practice to create your first template"
            action={isCoach ? { label: "View Practices", href: `/${teamSlug}/practices` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
