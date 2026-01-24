/**
 * Animation class presets using tw-animate-css.
 *
 * These presets provide consistent micro-animations across the application.
 * All animations use Tailwind's animate-in/animate-out utilities.
 *
 * @example
 * ```tsx
 * <div className={animations.fadeIn}>Fading in...</div>
 * <div className={withAnimation('slideInFromBottom', 'p-4')}>Slide in with padding</div>
 * ```
 */
export const animations = {
  // Enter animations
  fadeIn: 'animate-in fade-in duration-200',
  slideInFromBottom: 'animate-in fade-in slide-in-from-bottom-2 duration-200',
  slideInFromRight: 'animate-in fade-in slide-in-from-right-2 duration-200',
  zoomIn: 'animate-in zoom-in-95 fade-in duration-200',

  // Exit animations
  fadeOut: 'animate-out fade-out duration-200',
  slideOutToRight: 'animate-out fade-out slide-out-to-right duration-300',
  slideOutToLeft: 'animate-out fade-out slide-out-to-left duration-300',
  zoomOut: 'animate-out zoom-out-95 fade-out duration-200',

  // Success state
  successPop: 'animate-in zoom-in fade-in duration-200',
} as const;

/**
 * Helper to combine animation with existing classes.
 *
 * @param animation - The animation preset to use
 * @param className - Additional classes to append
 * @returns Combined class string
 *
 * @example
 * ```tsx
 * <div className={withAnimation('fadeIn', 'bg-blue-500 p-4')}>
 *   Content with fade-in animation and additional styles
 * </div>
 * ```
 */
export function withAnimation(
  animation: keyof typeof animations,
  className?: string
): string {
  return `${animations[animation]} ${className || ''}`.trim();
}
