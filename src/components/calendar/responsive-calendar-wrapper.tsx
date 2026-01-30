'use client';

import * as React from 'react';
import { useIsMobile } from '@/hooks/use-media-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Context to pass down the current mode to children
type CalendarMode = 'mobile' | 'desktop';
const ResponsiveCalendarContext = React.createContext<CalendarMode>('desktop');

/**
 * Props for the ResponsiveCalendarWrapper component
 */
export interface ResponsiveCalendarWrapperProps {
  /** Button or element that opens the calendar */
  trigger: React.ReactNode;
  /** Calendar content (DayPicker or similar) */
  children: React.ReactNode;
  /** Optional title for the mobile drawer header */
  title?: string;
  /** If true, desktop shows inline (no popup). Default: false (shows Dialog popup) */
  inline?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A calendar wrapper component that adapts to screen size:
 * - Mobile (< 768px): Renders calendar in a Drawer (bottom sheet)
 * - Desktop (>= 768px): Renders calendar inline or in Dialog (based on inline prop)
 *
 * Follows the ResponsiveMenu pattern for mobile-first design.
 *
 * @example
 * ```tsx
 * <ResponsiveCalendarWrapper
 *   trigger={<button>Select Date</button>}
 *   title="Select Date"
 * >
 *   <DayPicker mode="single" selected={date} onSelect={setDate} />
 * </ResponsiveCalendarWrapper>
 * ```
 */
export function ResponsiveCalendarWrapper({
  trigger,
  children,
  title,
  inline = false,
  open,
  onOpenChange,
}: ResponsiveCalendarWrapperProps) {
  const isMobile = useIsMobile();

  // Mobile: Always use Drawer (bottom sheet)
  if (isMobile) {
    return (
      <ResponsiveCalendarContext.Provider value="mobile">
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="pb-safe">
            {title && (
              <DrawerHeader>
                <DrawerTitle>{title}</DrawerTitle>
              </DrawerHeader>
            )}
            <div className="p-4 pb-8">{children}</div>
          </DrawerContent>
        </Drawer>
      </ResponsiveCalendarContext.Provider>
    );
  }

  // Desktop: If inline mode, just render trigger (no popup)
  // The caller is responsible for rendering the calendar separately
  if (inline) {
    return (
      <ResponsiveCalendarContext.Provider value="desktop">
        {/* In inline mode, trigger is not needed for opening anything */}
        {children}
      </ResponsiveCalendarContext.Provider>
    );
  }

  // Desktop: Use Dialog for popup calendar
  return (
    <ResponsiveCalendarContext.Provider value="desktop">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          {title && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
          )}
          <div className="p-4">{children}</div>
        </DialogContent>
      </Dialog>
    </ResponsiveCalendarContext.Provider>
  );
}

/**
 * Hook to get the current calendar display mode.
 * Useful for child components that need to adapt styling.
 *
 * @returns 'mobile' | 'desktop'
 */
export function useCalendarMode(): CalendarMode {
  return React.useContext(ResponsiveCalendarContext);
}
