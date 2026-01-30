// ============================================================================
// Sparkline Component
// ============================================================================
// Minimal SVG sparkline for compact trend visualization without axes or labels.
// Used for equipment usage trends on the dashboard.

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SparklineProps {
  /** Array of numeric data points to visualize */
  data: number[];
  /** SVG width in pixels */
  width?: number;
  /** SVG height in pixels */
  height?: number;
  /** Stroke color (CSS color or 'currentColor') */
  strokeColor?: string;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Renders a sparkline chart as an SVG polyline.
 *
 * Edge cases handled:
 * - Returns null if data has fewer than 2 points
 * - Handles flat line (all same values) by using range fallback of 1
 * - Accounts for stroke width in padding to prevent clipping
 *
 * @example
 * <Sparkline
 *   data={[10, 15, 12, 18, 14, 20]}
 *   width={120}
 *   height={32}
 *   strokeColor="var(--text-muted)"
 *   className="text-teal-400"
 * />
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  strokeColor = 'currentColor',
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  // Guard: need at least 2 points to draw a line
  if (data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  // Avoid division by zero for flat line (all same values)
  const range = max - min || 1;

  // Leave padding for stroke width to prevent clipping at edges
  const padding = strokeWidth;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  // Generate polyline points: scale data to fit SVG viewport
  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth;
      // Invert y-axis: SVG y=0 is top, but we want higher values at top
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('flex-shrink-0', className)}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
