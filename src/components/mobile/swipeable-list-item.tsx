'use client';

import * as React from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { cn } from '@/lib/utils';

/**
 * Props for SwipeableListItem component
 */
export interface SwipeableListItemProps {
  /** Content to render inside the swipeable container */
  children: React.ReactNode;
  /** Callback when swipe left completes (typically delete action) */
  onSwipeLeft?: () => void;
  /** Callback when swipe right completes (typically edit action) */
  onSwipeRight?: () => void;
  /** Label for left action revealed on swipe right (default: "Edit") */
  leftLabel?: string;
  /** Label for right action revealed on swipe left (default: "Delete") */
  rightLabel?: string;
  /** Custom icon for left action */
  leftIcon?: React.ReactNode;
  /** Custom icon for right action */
  rightIcon?: React.ReactNode;
  /** Disable swipe gestures */
  disabled?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Hook to detect mobile viewport
 * Returns true if viewport width is less than 768px (matches md: breakpoint)
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // Check initial state
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Swipeable list item with reveal actions for mobile touch interfaces
 *
 * On mobile (< 768px viewport):
 * - Swipe left to reveal delete action (red background)
 * - Swipe right to reveal edit action (blue background)
 * - Release mid-swipe to snap back
 *
 * On desktop (>= 768px viewport):
 * - Renders children directly without swipe functionality
 * - Use hover actions or context menus instead
 *
 * @example
 * ```tsx
 * <SwipeableListItem
 *   onSwipeLeft={() => handleDelete(item.id)}
 *   onSwipeRight={() => handleEdit(item.id)}
 * >
 *   <ItemCard item={item} />
 * </SwipeableListItem>
 * ```
 */
export function SwipeableListItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Edit',
  rightLabel = 'Delete',
  leftIcon,
  rightIcon,
  disabled = false,
  className,
}: SwipeableListItemProps) {
  const isMobile = useIsMobile();

  const { bind, x, isSwiping, swipeDirection } = useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    disabled: disabled || !isMobile,
  });

  // On desktop, render children directly without swipe wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  // Calculate opacity for action backgrounds based on swipe distance
  const actionOpacity = Math.min(Math.abs(x) / 80, 1);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Right action - revealed on swipe left (delete) */}
      {onSwipeLeft && (
        <div
          className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-500 text-white"
          style={{ opacity: swipeDirection === 'left' ? actionOpacity : 0 }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-1">
            {rightIcon || <Trash2 className="h-5 w-5" />}
            <span className="text-sm font-medium">{rightLabel}</span>
          </div>
        </div>
      )}

      {/* Left action - revealed on swipe right (edit) */}
      {onSwipeRight && (
        <div
          className="absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-blue-500 text-white"
          style={{ opacity: swipeDirection === 'right' ? actionOpacity : 0 }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-1">
            {leftIcon || <Pencil className="h-5 w-5" />}
            <span className="text-sm font-medium">{leftLabel}</span>
          </div>
        </div>
      )}

      {/* Swipeable content */}
      <div
        {...bind()}
        className={cn(
          'relative bg-background',
          isSwiping && 'cursor-grabbing'
        )}
        style={{
          transform: `translateX(${x}px)`,
          touchAction: 'pan-y', // Allow vertical scroll, capture horizontal
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
