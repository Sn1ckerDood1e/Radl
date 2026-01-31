'use client';

import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { SyncStatusIndicator } from '@/components/pwa/sync-status-indicator';
import { ContextSwitcher } from './context-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
  isSuperAdmin?: boolean;  // Show Admin Panel link for super admins
}

export function DashboardHeader({ team, contexts, isSuperAdmin }: DashboardHeaderProps) {
  const router = useRouter();

  // Determine the current slug for links
  // Priority: contexts (new) > team (legacy)
  const currentSlug = contexts?.currentContext.viewMode === 'facility'
    ? contexts.facility?.slug
    : contexts?.clubs.find(c => c.id === contexts.currentContext.clubId)?.slug
      ?? team?.slug;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="bg-[var(--surface-1)] border-b border-[var(--border-subtle)] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Club/Team Display */}
          <div className="flex items-center gap-4">
            {/* Brand Name */}
            <Link
              href={currentSlug ? `/${currentSlug}` : '/'}
              className="flex items-center gap-2"
            >
              {/* Crest placeholder - replace with <img src="/crest/radl-shield-color.svg" /> when available */}
              <div className="h-8 w-8 rounded bg-teal-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">R</span>
              </div>
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
                    className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 bg-teal-600 text-white"
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

          {/* Right side - Sync Status + Notifications + User Menu */}
          <div className="flex items-center gap-4">
            <SyncStatusIndicator />
            {currentSlug && <NotificationBell teamSlug={currentSlug} />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center hover:bg-[var(--surface-3)] transition-colors">
                  <User className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isSuperAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
