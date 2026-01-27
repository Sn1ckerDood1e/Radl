'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Calendar, Package, Home } from 'lucide-react';
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

interface BottomNavigationProps {
  teamSlug: string;
}

/**
 * Mobile bottom navigation bar for team pages.
 *
 * Fixed at bottom on mobile (<768px), hidden on desktop (>=768px).
 * Maximum 5 items following iOS tab bar pattern.
 * Touch targets meet WCAG 2.5.5 (h-16 = 64px > 44px minimum).
 * Settings not included (accessible from desktop or profile menu).
 */
export function BottomNavigation({ teamSlug }: BottomNavigationProps) {
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
    <div className="bg-[var(--surface-1)] border-t border-[var(--border-subtle)]">
      <nav className="flex justify-around items-center h-16 max-w-screen-sm mx-auto px-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 transition-colors rounded-lg
                ${active
                  ? 'text-emerald-500'
                  : 'text-[var(--text-muted)] active:text-[var(--text-primary)]'
                }
              `}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
