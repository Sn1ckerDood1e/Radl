'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  UsersRound,
  ScrollText,
  ArrowLeft,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/facilities', label: 'Facilities', icon: Building2 },
  { href: '/admin/clubs', label: 'Clubs', icon: UsersRound },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

/**
 * Admin sidebar navigation.
 *
 * Provides navigation to all admin sections:
 * - Dashboard (platform overview)
 * - Users (Phase 37)
 * - Facilities (Phase 38)
 * - Clubs (Phase 38)
 * - Audit Log (Phase 40)
 *
 * Plus a "Return to App" link to exit admin mode.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-[calc(100vh-3.5rem)] border-r border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <div className="p-4">
        <h2 className="font-semibold text-lg mb-4 text-[var(--text-primary)]">Admin Panel</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="absolute bottom-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to App
        </Link>
      </div>
    </aside>
  );
}
