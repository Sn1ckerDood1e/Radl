'use client';

import Link from 'next/link';

interface UsageLog {
  id: string;
  usageDate: string;
  practice: {
    id: string;
    name: string;
    date: string;
  };
}

interface UsageHistoryProps {
  usageLogs: UsageLog[];
  teamSlug: string;
}

export function UsageHistory({ usageLogs, teamSlug }: UsageHistoryProps) {
  if (usageLogs.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Usage History</h3>
        <p className="text-zinc-500 text-sm">
          No usage history recorded yet. Usage is logged when this equipment is assigned to a lineup.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-medium text-white mb-4">
        Usage History
        <span className="text-sm font-normal text-zinc-500 ml-2">
          ({usageLogs.length} {usageLogs.length === 1 ? 'session' : 'sessions'})
        </span>
      </h3>

      <div className="space-y-3">
        {usageLogs.map((log) => {
          const date = new Date(log.usageDate);
          const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
          });

          return (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <div>
                  <Link
                    href={`/${teamSlug}/practices/${log.practice.id}`}
                    className="text-sm font-medium text-zinc-200 hover:text-teal-400 transition-colors"
                  >
                    {log.practice.name}
                  </Link>
                </div>
              </div>
              <span className="text-sm text-zinc-500">{formattedDate}</span>
            </div>
          );
        })}
      </div>

      {usageLogs.length >= 20 && (
        <p className="text-xs text-zinc-500 mt-4">
          Showing most recent 20 sessions
        </p>
      )}
    </div>
  );
}
