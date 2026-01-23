'use client';

import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SyncStatus } from '@/components/pwa/sync-status';
import { ClubSwitcher } from './club-switcher';

interface Team {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface Club {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  roles: string[];
  isCurrent: boolean;
}

interface DashboardHeaderProps {
  team: Team | null;  // Keep for backward compatibility
  clubs?: Club[];
  currentClubId?: string;
}

export function DashboardHeader({ team, clubs, currentClubId }: DashboardHeaderProps) {
  // Determine the current slug for links (prefer club over legacy team)
  const currentSlug = clubs && clubs.length > 0
    ? (clubs.find(c => c.id === currentClubId)?.slug ?? clubs[0]?.slug)
    : team?.slug;

  return (
    <header className="bg-[var(--surface-1)] border-b border-[var(--border-subtle)] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Club/Team Display */}
          <div className="flex items-center gap-4">
            {/* Brand Name */}
            <Link
              href={currentSlug ? `/${currentSlug}` : '/'}
              className="flex items-center"
            >
              <span className="text-xl font-bold text-[var(--text-primary)]">RowOps</span>
            </Link>

            {/* Separator */}
            {(clubs && clubs.length > 0) || team ? (
              <span className="text-[var(--text-muted)]">/</span>
            ) : null}

            {/* Club Switcher (replaces team display for multi-club) */}
            {clubs && clubs.length > 0 ? (
              <ClubSwitcher initialClubs={clubs} currentClubId={currentClubId} />
            ) : team ? (
              // Fallback to legacy team display
              <div className="flex items-center gap-2">
                {team.logoUrl ? (
                  <Link href={`/${team.slug}`} className="flex-shrink-0">
                    <img
                      src={team.logoUrl}
                      alt={`${team.name} logo`}
                      className="h-6 w-6 rounded object-cover"
                    />
                  </Link>
                ) : (
                  <Link
                    href={`/${team.slug}`}
                    className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: team.primaryColor, color: '#fff' }}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </Link>
                )}
                <Link
                  href={`/${team.slug}`}
                  className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {team.name}
                </Link>
              </div>
            ) : null}
          </div>

          {/* Right side - Sync Status + Notifications */}
          <div className="flex items-center gap-4">
            <SyncStatus />
            {currentSlug && <NotificationBell teamSlug={currentSlug} />}
          </div>
        </div>
      </div>
    </header>
  );
}
