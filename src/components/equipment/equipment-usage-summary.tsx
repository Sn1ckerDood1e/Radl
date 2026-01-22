'use client';

import Link from 'next/link';

interface UsageSummaryItem {
  equipmentId: string;
  equipmentName: string;
  usageCount: number;
  lastUsed: string | null;
}

interface RecentUsage {
  id: string;
  equipmentId: string;
  equipmentName: string;
  practiceName: string;
  practiceId: string;
  usageDate: string;
}

interface EquipmentUsageSummaryProps {
  mostUsed: UsageSummaryItem[];
  recentUsage: RecentUsage[];
  teamSlug: string;
}

export function EquipmentUsageSummary({ mostUsed, recentUsage, teamSlug }: EquipmentUsageSummaryProps) {
  if (mostUsed.length === 0 && recentUsage.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Most Used Equipment */}
      {mostUsed.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Most Used</h3>
          <div className="space-y-2">
            {mostUsed.slice(0, 5).map((item, index) => (
              <div key={item.equipmentId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-4">{index + 1}.</span>
                  <Link
                    href={`/${teamSlug}/equipment/${item.equipmentId}`}
                    className="text-sm text-zinc-200 hover:text-emerald-400 transition-colors"
                  >
                    {item.equipmentName}
                  </Link>
                </div>
                <span className="text-xs text-zinc-500">
                  {item.usageCount} {item.usageCount === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentUsage.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentUsage.slice(0, 5).map((usage) => {
              const date = new Date(usage.usageDate);
              const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={usage.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <Link
                      href={`/${teamSlug}/equipment/${usage.equipmentId}`}
                      className="text-zinc-200 hover:text-emerald-400 transition-colors truncate"
                    >
                      {usage.equipmentName}
                    </Link>
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">{formattedDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
