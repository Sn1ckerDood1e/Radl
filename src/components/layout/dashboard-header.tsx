'use client';

import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SyncStatusIndicator } from '@/components/pwa/sync-status-indicator';
import { ContextSwitcher } from './context-switcher';

interface Team {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface Facility {
  id: string;
  name: string;
  slug: string;
  isFacilityAdmin: boolean;
}

interface Club {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  roles: string[];
}

interface CurrentContext {
  viewMode: 'facility' | 'club' | null;
  facilityId: string | null;
  clubId: string | null;
}

interface AvailableContextsResponse {
  facility?: Facility;
  clubs: Club[];
  currentContext: CurrentContext;
}

interface DashboardHeaderProps {
  team: Team | null;  // Keep for backward compatibility
  contexts?: AvailableContextsResponse;  // New: from layout
}

export function DashboardHeader({ team, contexts }: DashboardHeaderProps) {
  // Determine the current slug for links
  // Priority: contexts (new) > team (legacy)
  const currentSlug = contexts?.currentContext.viewMode === 'facility'
    ? contexts.facility?.slug
    : contexts?.clubs.find(c => c.id === contexts.currentContext.clubId)?.slug
      ?? team?.slug;

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
              <span className="text-xl font-bold text-[var(--text-primary)]">Radl</span>
            </Link>

            {/* Separator */}
            {contexts || team ? (
              <span className="text-[var(--text-muted)]">/</span>
            ) : null}

            {/* Context Switcher (replaces ClubSwitcher and legacy team display) */}
            {contexts ? (
              <ContextSwitcher initialContexts={contexts} />
            ) : team ? (
              // Fallback to legacy team display for backward compat
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
                    className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 bg-emerald-600 text-white"
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
            <SyncStatusIndicator />
            {currentSlug && <NotificationBell teamSlug={currentSlug} />}
          </div>
        </div>
      </div>
    </header>
  );
}
