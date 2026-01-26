'use client';

import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface InlineSuccessProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  autoHide?: boolean;
  hideDelay?: number;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * Animated checkmark icon for inline success feedback.
 * Appears with zoom-in and fade-in animation.
 * Optionally auto-hides after a delay.
 *
 * @example
 * ```tsx
 * <InlineSuccess size="md" autoHide hideDelay={2000} />
 * ```
 */
export function InlineSuccess({
  size = 'md',
  className,
  autoHide = false,
  hideDelay = 2000,
}: InlineSuccessProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        // Wait for fade-out animation to complete
        setTimeout(() => {
          setIsVisible(false);
        }, 200);
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay]);

  if (!isVisible) return null;

  return (
    <CheckCircle
      className={cn(
        'text-emerald-500',
        sizeMap[size],
        isExiting
          ? 'animate-out fade-out duration-200'
          : 'animate-in zoom-in fade-in duration-200',
        className
      )}
    />
  );
}
