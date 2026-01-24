'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Context to pass down the current mode to menu items
type MenuMode = 'mobile' | 'desktop';
const ResponsiveMenuContext = React.createContext<MenuMode>('desktop');

/**
 * Props for the ResponsiveMenu component
 */
export interface ResponsiveMenuProps {
  /** Button or element that opens the menu */
  trigger: React.ReactNode;
  /** Menu items to render */
  children: React.ReactNode;
  /** Dropdown alignment on desktop (default: 'end') */
  align?: 'start' | 'center' | 'end';
  /** Optional title for the bottom sheet on mobile */
  title?: string;
}

/**
 * A menu component that adapts to screen size:
 * - Desktop (>= 768px): Renders as DropdownMenu
 * - Mobile (< 768px): Renders as Drawer (bottom sheet)
 *
 * @example
 * ```tsx
 * <ResponsiveMenu trigger={<Button>Actions</Button>} title="Actions">
 *   <ResponsiveMenuItem onSelect={() => console.log('Edit')}>
 *     Edit
 *   </ResponsiveMenuItem>
 *   <ResponsiveMenuItem onSelect={() => console.log('Delete')} destructive>
 *     Delete
 *   </ResponsiveMenuItem>
 * </ResponsiveMenu>
 * ```
 */
export function ResponsiveMenu({
  trigger,
  children,
  align = 'end',
  title,
}: ResponsiveMenuProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ResponsiveMenuContext.Provider value="mobile">
        <Drawer>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent>
            {title && (
              <DrawerHeader>
                <DrawerTitle>{title}</DrawerTitle>
              </DrawerHeader>
            )}
            <div className="p-4 pb-8 space-y-1">{children}</div>
          </DrawerContent>
        </Drawer>
      </ResponsiveMenuContext.Provider>
    );
  }

  return (
    <ResponsiveMenuContext.Provider value="desktop">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align={align}>{children}</DropdownMenuContent>
      </DropdownMenu>
    </ResponsiveMenuContext.Provider>
  );
}

/**
 * Props for ResponsiveMenuItem component
 */
export interface ResponsiveMenuItemProps {
  /** Menu item content */
  children: React.ReactNode;
  /** Callback when item is selected */
  onSelect?: () => void;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Red styling for destructive actions like delete */
  destructive?: boolean;
  /** Optional icon to display before text */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A menu item that adapts its styling based on parent context:
 * - Desktop: Renders as DropdownMenuItem
 * - Mobile: Renders as full-width button with touch-friendly sizing
 *
 * @example
 * ```tsx
 * <ResponsiveMenuItem
 *   icon={<TrashIcon className="size-4" />}
 *   onSelect={handleDelete}
 *   destructive
 * >
 *   Delete
 * </ResponsiveMenuItem>
 * ```
 */
export function ResponsiveMenuItem({
  children,
  onSelect,
  disabled = false,
  destructive = false,
  icon,
  className,
}: ResponsiveMenuItemProps) {
  const mode = React.useContext(ResponsiveMenuContext);

  if (mode === 'mobile') {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className={cn(
          // Base styles
          'w-full min-h-[44px] p-4 text-left rounded-lg',
          'flex items-center gap-3',
          'transition-colors',
          // Interactive states
          'hover:bg-accent focus:bg-accent focus:outline-none',
          'disabled:pointer-events-none disabled:opacity-50',
          // Destructive variant
          destructive && 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10',
          // Icon styling
          '[&_svg]:size-5 [&_svg]:shrink-0',
          destructive && '[&_svg]:text-destructive',
          !destructive && '[&_svg]:text-muted-foreground',
          className
        )}
      >
        {icon}
        <span className="flex-1">{children}</span>
      </button>
    );
  }

  // Desktop: Use DropdownMenuItem
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      disabled={disabled}
      variant={destructive ? 'destructive' : 'default'}
      className={className}
    >
      {icon}
      {children}
    </DropdownMenuItem>
  );
}

/**
 * Hook to get the current menu mode (for advanced customization)
 */
export function useMenuMode(): MenuMode {
  return React.useContext(ResponsiveMenuContext);
}
