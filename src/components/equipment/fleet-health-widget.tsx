import Link from 'next/link';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Ship } from 'lucide-react';
import type { ReadinessStatus } from '@/lib/equipment/readiness';

interface FleetHealthWidgetProps {
  teamSlug: string;
  statusCounts: Record<ReadinessStatus, number>;
  totalEquipment: number;
}

/**
 * Status configuration for display.
 */
const statusConfig: Record<ReadinessStatus, {
  label: string;
  icon: typeof CheckCircle2;
  colorClass: string;
  bgClass: string;
}> = {
  READY: {
    label: 'Ready',
    icon: CheckCircle2,
    colorClass: 'text-teal-400',
    bgClass: 'bg-teal-500/15',
  },
  INSPECT_SOON: {
    label: 'Inspect Soon',
    icon: Clock,
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/15',
  },
  NEEDS_ATTENTION: {
    label: 'Needs Attention',
    icon: AlertTriangle,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
  },
  OUT_OF_SERVICE: {
    label: 'Out of Service',
    icon: XCircle,
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/15',
  },
};

/**
 * Fleet health widget for dashboard.
 * Shows equipment status breakdown with visual indicators.
 */
export function FleetHealthWidget({
  teamSlug,
  statusCounts,
  totalEquipment,
}: FleetHealthWidgetProps) {
  // If no equipment, show empty state
  if (totalEquipment === 0) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fleet Health</h2>
        </div>
        <div className="p-8 text-center">
          <Ship className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">No equipment registered</p>
          <Link
            href={`/${teamSlug}/equipment/new`}
            className="inline-flex items-center gap-2 text-sm text-teal-500 hover:text-teal-400 font-medium mt-4"
          >
            Add equipment
          </Link>
        </div>
      </div>
    );
  }

  // Calculate percentage for health bar
  const readyPercentage = Math.round((statusCounts.READY / totalEquipment) * 100);

  // Status order: show issues first (most severe to least), then ready
  const statusOrder: ReadinessStatus[] = ['OUT_OF_SERVICE', 'NEEDS_ATTENTION', 'INSPECT_SOON', 'READY'];

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fleet Health</h2>
        <Link
          href={`/${teamSlug}/equipment`}
          className="text-sm text-teal-500 hover:text-teal-400 font-medium"
        >
          View all
        </Link>
      </div>

      <div className="p-4">
        {/* Health summary bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">
              {statusCounts.READY} of {totalEquipment} ready
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {readyPercentage}%
            </span>
          </div>
          <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden flex">
            {statusOrder.map((status) => {
              const count = statusCounts[status];
              if (count === 0) return null;
              const percentage = (count / totalEquipment) * 100;
              const config = statusConfig[status];
              return (
                <div
                  key={status}
                  className={`${config.bgClass} h-full`}
                  style={{ width: `${percentage}%` }}
                  title={`${config.label}: ${count}`}
                />
              );
            })}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {statusOrder.map((status) => {
            const count = statusCounts[status];
            const config = statusConfig[status];
            const Icon = config.icon;

            return (
              <div
                key={status}
                className={`${config.bgClass} rounded-lg p-3 flex items-center gap-3`}
              >
                <Icon className={`h-5 w-5 ${config.colorClass}`} />
                <div>
                  <div className={`text-lg font-bold ${config.colorClass}`}>
                    {count}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {config.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action prompt if issues exist */}
        {(statusCounts.OUT_OF_SERVICE > 0 || statusCounts.NEEDS_ATTENTION > 0) && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            <Link
              href={`/${teamSlug}/equipment`}
              className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {statusCounts.OUT_OF_SERVICE + statusCounts.NEEDS_ATTENTION} item(s) need attention
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
