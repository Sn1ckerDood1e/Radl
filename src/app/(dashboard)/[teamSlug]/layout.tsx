import { NavigationSidebar } from '@/components/layout/navigation-sidebar';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { AnnouncementBanner } from '@/components/announcements/announcement-banner';
import { prisma } from '@/lib/prisma';

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}

/**
 * Team layout shell providing persistent navigation.
 *
 * Desktop: Left sidebar navigation (256px wide)
 * Mobile: Bottom navigation bar (fixed)
 *
 * This layout wraps all [teamSlug] pages with a master-detail pattern.
 * Content area is scrollable with proper padding for mobile bottom nav.
 */
export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { teamSlug } = await params;

  // Find the team by slug
  const team = await prisma.team.findUnique({
    where: { slug: teamSlug },
    select: { id: true },
  });

  // Fetch most recent URGENT announcement for banner
  let urgentAnnouncement: { id: string; title: string; body: string; priority: 'URGENT' } | null = null;

  if (team) {
    const now = new Date();
    const urgent = await prisma.announcement.findFirst({
      where: {
        teamId: team.id,
        priority: 'URGENT',
        archivedAt: null,
        OR: [
          // Non-practice: not expired
          {
            practiceId: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
          // Practice-linked: practice hasn't ended
          {
            practiceId: { not: null },
            practice: {
              endTime: { gt: now },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        body: true,
        priority: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (urgent) {
      urgentAnnouncement = {
        id: urgent.id,
        title: urgent.title,
        body: urgent.body,
        priority: urgent.priority as 'URGENT',
      };
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <NavigationSidebar teamSlug={teamSlug} />
      </aside>

      {/* Main content area - scrollable, with bottom padding on mobile for fixed nav */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {urgentAnnouncement && (
          <div className="container mx-auto px-4 pt-4">
            <AnnouncementBanner announcement={urgentAnnouncement} />
          </div>
        )}
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav - fixed at bottom, hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
        <BottomNavigation teamSlug={teamSlug} />
      </nav>
    </div>
  );
}
