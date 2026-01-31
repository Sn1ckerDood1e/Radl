import { prisma } from '@/lib/prisma';
import { PlatformStats } from '@/components/admin/platform-stats';

/**
 * Admin dashboard landing page.
 *
 * Shows platform-wide statistics:
 * - User count (unique users across memberships)
 * - Facility count
 * - Club count
 * - Recent admin activity (audit log with PLATFORM clubId)
 */
export default async function AdminDashboardPage() {
  // Fetch platform-wide statistics
  const [userGroups, facilityCount, clubCount, recentAuditLogs] = await Promise.all([
    // Count unique users across all memberships
    prisma.clubMembership.groupBy({
      by: ['userId'],
      _count: true,
    }),

    prisma.facility.count(),

    prisma.team.count(),

    // Recent admin audit logs (last 10)
    prisma.auditLog.findMany({
      where: { clubId: 'PLATFORM' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        action: true,
        targetType: true,
        createdAt: true,
      },
    }),
  ]);

  const userCount = userGroups.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Dashboard</h1>
        <p className="text-[var(--text-muted)]">
          Overview of your Radl platform
        </p>
      </div>

      <PlatformStats
        userCount={userCount}
        facilityCount={facilityCount}
        clubCount={clubCount}
      />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Admin Activity</h2>
        {recentAuditLogs.length === 0 ? (
          <p className="text-[var(--text-muted)]">No admin activity yet.</p>
        ) : (
          <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]">
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Action</th>
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Target</th>
                  <th className="p-3 text-left text-sm font-medium text-[var(--text-muted)]">Time</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface-1)]">
                {recentAuditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border-subtle)] last:border-0">
                    <td className="p-3 text-sm text-[var(--text-primary)]">{log.action}</td>
                    <td className="p-3 text-sm text-[var(--text-secondary)]">{log.targetType}</td>
                    <td className="p-3 text-sm text-[var(--text-muted)]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
