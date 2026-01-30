'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Calendar, Package, Settings, Home } from 'lucide-react';
import { useAbility } from '@/hooks/use-ability';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  permission?: {
    action: string;
    subject: string;
  };
}

interface NavigationSidebarProps {
  teamSlug: string;
}

/**
 * Desktop navigation sidebar for team pages.
 *
 * Hidden on mobile (<768px), displayed on desktop (>=768px).
 * Shows navigation items filtered by user permissions.
 * Highlights active section with emerald accent.
 */
export function NavigationSidebar({ teamSlug }: NavigationSidebarProps) {
  const pathname = usePathname();
  const ability = useAbility();

  const navItems: NavItem[] = [
    { href: `/${teamSlug}`, icon: Home, label: 'Home', exact: true },
    { href: `/${teamSlug}/roster`, icon: Users, label: 'Roster' },
    { href: `/${teamSlug}/practices`, icon: Calendar, label: 'Practices' },
    {
      href: `/${teamSlug}/equipment`,
      icon: Package,
      label: 'Equipment',
      permission: { action: 'manage', subject: 'Equipment' }
    },
    {
      href: `/${teamSlug}/settings`,
      icon: Settings,
      label: 'Settings',
      permission: { action: 'manage', subject: 'Practice' }
    },
  ];

  // Filter items based on permissions
  const filteredItems = navItems.filter(item => {
    if (!item.permission) return true;
    return ability.can(item.permission.action as any, item.permission.subject as any);
  });

  // Check if item is active
  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="flex flex-col gap-1 p-4">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium
              ${active
                ? 'bg-teal-500/20 text-teal-500'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
