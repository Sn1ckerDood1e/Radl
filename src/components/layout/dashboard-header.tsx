'use client';

import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface Team {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

interface DashboardHeaderProps {
  team: Team | null;
}

export function DashboardHeader({ team }: DashboardHeaderProps) {
  return (
    <header className="bg-[var(--surface-1)] border-b border-[var(--border-subtle)] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Team Name */}
          <div className="flex items-center gap-4">
            {/* Team Logo */}
            {team?.logoUrl ? (
              <Link href={team ? `/${team.slug}` : '/'} className="flex-shrink-0">
                <img
                  src={team.logoUrl}
                  alt={`${team.name} logo`}
                  className="h-9 w-9 rounded-lg object-cover ring-2 ring-[var(--border)]"
                />
              </Link>
            ) : team ? (
              <Link
                href={`/${team.slug}`}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ring-[var(--border)]"
                style={{ backgroundColor: team.primaryColor, color: '#fff' }}
              >
                {team.name.charAt(0).toUpperCase()}
              </Link>
            ) : null}

            {/* Brand + Team Name */}
            <Link
              href={team ? `/${team.slug}` : '/'}
              className="flex items-center gap-2"
            >
              <span className="text-xl font-bold text-[var(--text-primary)]">RowOps</span>
              {team && (
                <>
                  <span className="text-[var(--text-muted)]">/</span>
                  <span className="text-lg font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    {team.name}
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Right side - Notifications */}
          <div className="flex items-center gap-4">
            {team && <NotificationBell teamSlug={team.slug} />}
          </div>
        </div>
      </div>
    </header>
  );
}
