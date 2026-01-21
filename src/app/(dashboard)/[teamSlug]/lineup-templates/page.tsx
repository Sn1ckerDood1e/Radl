import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireTeam } from '@/lib/auth/authorize';
import { prisma } from '@/lib/prisma';
import { Plus } from 'lucide-react';

interface PageProps {
  params: Promise<{ teamSlug: string }>;
}

export default async function LineupTemplatesPage({ params }: PageProps) {
  const { teamSlug } = await params;

  // Verify user has a team
  const { claims } = await requireTeam();

  if (!claims.team_id) {
    redirect('/create-team');
  }

  // Get team by slug
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

  const isCoach = claims.user_role === 'COACH';

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
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-zinc-300">No lineup templates yet</h3>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto">
            Save a lineup from a practice to create your first template
          </p>
        </div>
      )}
    </div>
  );
}
