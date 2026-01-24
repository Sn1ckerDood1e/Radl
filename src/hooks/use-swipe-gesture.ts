'use client';

import { useState, useCallback, useRef } from 'react';
import { useDrag } from '@use-gesture/react';

/**
 * Options for the useSwipeGesture hook
 */
export interface UseSwipeGestureOptions {
  /** Callback when swipe left completes (e.g., delete action) */
  onSwipeLeft?: () => void;
  /** Callback when swipe right completes (e.g., edit action) */
  onSwipeRight?: () => void;
  /** Minimum distance in pixels to trigger swipe (default: 80) */
  swipeThreshold?: number;
  /** Minimum velocity to trigger swipe (default: 0.3) */
  velocityThreshold?: number;
  /** Disable swipe gestures */
  disabled?: boolean;
}

/**
 * Return type for the useSwipeGesture hook
 */
export interface UseSwipeGestureReturn {
  /** Bind function to attach to the draggable element - spread onto target element */
  bind: (...args: unknown[]) => Record<string, unknown>;
  /** Current x offset in pixels for styling transform */
  x: number;
  /** Whether the user is currently swiping */
  isSwiping: boolean;
  /** Current swipe direction based on movement */
  swipeDirection: 'left' | 'right' | null;
}

/**
 * Hook for horizontal swipe gestures on list items
 *
 * Wraps @use-gesture/react's useDrag for swipe-to-reveal actions.
 * Designed for mobile list items where swipe left reveals delete
 * and swipe right reveals edit actions.
 *
 * @example
 * ```tsx
 * const { bind, x, isSwiping } = useSwipeGesture({
 *   onSwipeLeft: () => handleDelete(),
 *   onSwipeRight: () => handleEdit(),
 * });
 *
 * return (
 *   <div {...bind()} style={{ transform: `translateX(${x}px)` }}>
 *     Content
 *   </div>
 * );
 * ```
 */
export function useSwipeGesture(options: UseSwipeGestureOptions = {}): UseSwipeGestureReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    swipeThreshold = 80,
    velocityThreshold = 0.3,
    disabled = false,
  } = options;

  const [x, setX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Animation frame reference for cleanup
  const animationRef = useRef<number | null>(null);

  /**
   * Animate x back to 0 using requestAnimationFrame
   */
  const animateToCenter = useCallback(() => {
    const startX = x;
    const startTime = performance.now();
    const duration = 200; // ms

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newX = startX * (1 - eased);

      setX(Math.abs(newX) < 1 ? 0 : newX);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [x]);

  const bind = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], dragging, cancel }) => {
      if (disabled) {
        cancel();
        return;
      }

      if (dragging) {
        setIsSwiping(true);

        // Update swipe direction based on current movement
        if (mx < 0) {
          setSwipeDirection('left');
        } else if (mx > 0) {
          setSwipeDirection('right');
        } else {
          setSwipeDirection(null);
        }

        // Apply rubber band effect at bounds
        const maxDistance = 120;
        let clampedX = mx;

        if (Math.abs(mx) > maxDistance) {
          // Rubber band: resistance increases beyond bounds
          const overflow = Math.abs(mx) - maxDistance;
          const rubberBand = overflow * 0.3; // 30% resistance
          clampedX = Math.sign(mx) * (maxDistance + rubberBand);
        }

        setX(clampedX);
      } else {
        // Drag ended - check if swipe should complete
        setIsSwiping(false);

        const absMovement = Math.abs(mx);
        const absVelocity = Math.abs(vx);

        // Determine if swipe threshold met
        const thresholdMet = absMovement > swipeThreshold || absVelocity > velocityThreshold;

        if (thresholdMet) {
          if (mx < 0 && onSwipeLeft) {
            // Swiped left - trigger action
            onSwipeLeft();
          } else if (mx > 0 && onSwipeRight) {
            // Swiped right - trigger action
            onSwipeRight();
          }
        }

        // Animate back to center
        animateToCenter();
        setSwipeDirection(null);
      }
    },
    {
      axis: 'x', // Only track horizontal movement, allows vertical scroll
      filterTaps: true, // Prevent tap events from triggering drag
      bounds: { left: -150, right: 150 }, // Extended bounds for rubber band
      rubberband: true,
      from: () => [x, 0], // Start from current position for smooth continuation
    }
  );

  return {
    bind,
    x,
    isSwiping,
    swipeDirection,
  };
}
