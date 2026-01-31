import { Users, Building2, UsersRound } from 'lucide-react';

interface PlatformStatsProps {
  userCount: number;
  facilityCount: number;
  clubCount: number;
}

/**
 * Platform-wide statistics cards for admin dashboard.
 *
 * Displays:
 * - Total Users (unique users across all memberships)
 * - Facilities count
 * - Clubs count
 */
export function PlatformStats({ userCount, facilityCount, clubCount }: PlatformStatsProps) {
  const stats = [
    { label: 'Total Users', value: userCount, icon: Users },
    { label: 'Facilities', value: facilityCount, icon: Building2 },
    { label: 'Clubs', value: clubCount, icon: UsersRound },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6"
        >
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-[var(--text-muted)]">
              {stat.label}
            </h3>
            <stat.icon className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {stat.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
