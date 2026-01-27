import Link from 'next/link';
import { AlertTriangle, Users, FileEdit, ChevronRight, CheckCircle2 } from 'lucide-react';

type AttentionItemType = 'equipment_inspection' | 'lineup_needed' | 'practice_unpublished';

interface AttentionItem {
  type: AttentionItemType;
  count: number;
  label: string;
  href: string;
}

interface QuickActionsWidgetProps {
  teamSlug: string;
  items: AttentionItem[];
}

/**
 * Get icon and color configuration based on attention item type.
 */
function getItemConfig(type: AttentionItemType): {
  icon: typeof AlertTriangle;
  colorClass: string;
  bgClass: string;
} {
  switch (type) {
    case 'equipment_inspection':
      return {
        icon: AlertTriangle,
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/15',
      };
    case 'lineup_needed':
      return {
        icon: Users,
        colorClass: 'text-blue-400',
        bgClass: 'bg-blue-500/15',
      };
    case 'practice_unpublished':
      return {
        icon: FileEdit,
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-500/15',
      };
  }
}

/**
 * Quick Actions widget for coach dashboard.
 * Shows context-aware attention-needed items with counts,
 * or "all caught up" success state when no items need attention.
 */
export function QuickActionsWidget({
  teamSlug,
  items,
}: QuickActionsWidgetProps) {
  // Success state: no items need attention
  if (items.length === 0) {
    return (
      <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Needs Attention</h2>
        </div>
        <div className="p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="font-medium text-emerald-400 mb-1">All caught up!</p>
          <p className="text-sm text-[var(--text-muted)]">No items need attention</p>
        </div>
      </div>
    );
  }

  // Main state: items need attention
  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Needs Attention</h2>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {items.map((item, index) => {
          const config = getItemConfig(item.type);
          const Icon = config.icon;

          return (
            <Link
              key={`${item.type}-${index}`}
              href={item.href}
              className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors group"
            >
              <div className={`h-10 w-10 rounded-lg ${config.bgClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${config.colorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {item.label}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
