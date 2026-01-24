'use client';

import { cn } from '@/lib/utils';
import { animations } from '@/lib/animation-utils';

interface AnimatedListItemProps {
  children: React.ReactNode;
  isExiting?: boolean;
  index?: number;
  className?: string;
}

/**
 * Wrapper component for list items with enter/exit animations.
 *
 * Provides consistent list item animations with optional stagger delay.
 * Enter animation slides in from bottom, exit animation slides out to right.
 *
 * @param children - Content to animate
 * @param isExiting - Whether the item is exiting (triggers exit animation)
 * @param index - Index for stagger delay (50ms per item)
 * @param className - Additional classes to apply
 *
 * @example
 * ```tsx
 * {items.map((item, i) => (
 *   <AnimatedListItem key={item.id} index={i}>
 *     <div>{item.name}</div>
 *   </AnimatedListItem>
 * ))}
 * ```
 *
 * @example With exit animation
 * ```tsx
 * <AnimatedListItem isExiting={isDeleting}>
 *   <div>Item being removed</div>
 * </AnimatedListItem>
 * ```
 */
export function AnimatedListItem({
  children,
  isExiting = false,
  index = 0,
  className,
}: AnimatedListItemProps) {
  const delay = index * 50; // 50ms stagger per item

  return (
    <div
      className={cn(
        isExiting ? animations.slideOutToRight : animations.slideInFromBottom,
        className
      )}
      style={{ animationDelay: isExiting ? undefined : `${delay}ms` }}
    >
      {children}
    </div>
  );
}
