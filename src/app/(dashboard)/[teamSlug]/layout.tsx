import { NavigationSidebar } from '@/components/layout/navigation-sidebar';
import { BottomNavigation } from '@/components/layout/bottom-navigation';

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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-[var(--border-subtle)] bg-[var(--surface-1)]">
        <NavigationSidebar teamSlug={teamSlug} />
      </aside>

      {/* Main content area - scrollable, with bottom padding on mobile for fixed nav */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav - fixed at bottom, hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <BottomNavigation teamSlug={teamSlug} />
      </nav>
    </div>
  );
}
