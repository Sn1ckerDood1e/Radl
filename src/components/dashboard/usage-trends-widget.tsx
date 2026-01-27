// ============================================================================
// UsageTrendsWidget Component
// ============================================================================
// Dashboard widget showing equipment usage trends via sparkline.
// Displays total hours this season with weekly trend visualization.
// Coach-only widget per CONTEXT.md.

import Link from 'next/link';
import { Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { Sparkline } from './sparkline';

// ============================================================================
// Types
// ============================================================================

interface UsageTrendsWidgetProps {
  teamSlug: string;
  /** Weekly usage data points (minutes or hours) for sparkline */
  sparklineData: number[];
  /** Total hours of equipment usage this season */
  totalHours: number;
  /** Optional season name to display */
  seasonName?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format hours with appropriate precision.
 * - Less than 1 hour: show with one decimal (e.g., "0.5 hours")
 * - 1-100 hours: show as integer (e.g., "42 hours")
 * - 100+ hours: show as integer (e.g., "156 hours")
 */
function formatHours(hours: number): string {
  if (hours === 0) {
    return '0 hours';
  }

  if (hours < 1) {
    return `${hours.toFixed(1)} hours`;
  }

  return `${Math.round(hours)} hours`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Equipment usage trends widget for coach dashboard.
 *
 * Features:
 * - Large total hours display for quick glance
 * - Sparkline showing weekly trend
 * - Season context when provided
 * - Empty state for insufficient data
 *
 * Note: This widget is only shown to coaches per CONTEXT.md.
 */
export function UsageTrendsWidget({
  teamSlug,
  sparklineData,
  totalHours,
  seasonName,
}: UsageTrendsWidgetProps) {
  const hasEnoughData = sparklineData.length >= 2;
  const hasAnyUsage = totalHours > 0;

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Equipment Usage
        </h2>
        <Link
          href={`/${teamSlug}/equipment`}
          className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
        >
          View all
        </Link>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Main stats row */}
        <div className="flex items-center justify-between mb-4">
          {/* Total hours */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15">
              <Clock className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatHours(totalHours)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {seasonName ? `${seasonName}` : 'This season'}
              </div>
            </div>
          </div>

          {/* Sparkline or placeholder */}
          <div className="flex items-center gap-2">
            {hasEnoughData ? (
              <Sparkline
                data={sparklineData}
                width={100}
                height={40}
                strokeColor="currentColor"
                className="text-emerald-400"
                strokeWidth={2}
              />
            ) : (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Not enough data</span>
              </div>
            )}
          </div>
        </div>

        {/* Trend indicator */}
        {hasEnoughData && (
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">
              Weekly trend ({sparklineData.length} weeks)
            </span>
          </div>
        )}

        {/* Empty state with no usage */}
        {!hasAnyUsage && (
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-muted)]">
              No equipment usage logged yet this season.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
