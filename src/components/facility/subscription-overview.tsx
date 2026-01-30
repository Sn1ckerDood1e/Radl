import { CreditCard, Calendar, Users, Package, AlertCircle } from 'lucide-react';

interface SubscriptionOverviewProps {
  // Since actual billing is not implemented, we show placeholder/mock data
  // When billing is implemented, this component will receive real data
  clubName: string;
  memberCount: number;
  equipmentCount: number;
  practiceCount: number;
  billingType: 'FACILITY' | 'CLUB' | 'HYBRID';
}

export function SubscriptionOverview({
  clubName,
  memberCount,
  equipmentCount,
  practiceCount,
  billingType,
}: SubscriptionOverviewProps) {
  // Mock subscription data - replace with real data when billing is implemented
  const subscriptionData = {
    plan: billingType === 'FACILITY' ? 'Facility Plan' : 'Club Pro',
    status: 'active' as const,
    nextBillingDate: billingType === 'FACILITY' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usageLimits: {
      members: 100,
      equipment: 50,
      practices: -1, // Unlimited
    },
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min(100, (current / limit) * 100);
  };

  const memberUsage = getUsagePercentage(memberCount, subscriptionData.usageLimits.members);
  const equipmentUsage = getUsagePercentage(equipmentCount, subscriptionData.usageLimits.equipment);

  return (
    <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)]">
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[var(--accent)]" />
          <h3 className="font-medium text-[var(--text-primary)]">Subscription Status</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">Plan</span>
          <span className="font-medium text-[var(--text-primary)]">{subscriptionData.plan}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">Status</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            subscriptionData.status === 'active'
              ? 'bg-teal-500/20 text-teal-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {subscriptionData.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        {subscriptionData.nextBillingDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Next Billing</span>
            <span className="text-sm text-[var(--text-primary)]">
              {subscriptionData.nextBillingDate.toLocaleDateString()}
            </span>
          </div>
        )}

        {billingType === 'FACILITY' && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              This club is covered under the facility subscription. No separate billing.
            </p>
          </div>
        )}

        {/* Usage Bars */}
        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">Usage</h4>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <Users className="h-3.5 w-3.5" />
                Members
              </span>
              <span className="text-[var(--text-secondary)]">
                {memberCount} / {subscriptionData.usageLimits.members}
              </span>
            </div>
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  memberUsage > 90 ? 'bg-amber-500' : 'bg-teal-500'
                }`}
                style={{ width: `${memberUsage}%` }}
              />
            </div>
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <Package className="h-3.5 w-3.5" />
                Equipment
              </span>
              <span className="text-[var(--text-secondary)]">
                {equipmentCount} / {subscriptionData.usageLimits.equipment}
              </span>
            </div>
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  equipmentUsage > 90 ? 'bg-amber-500' : 'bg-teal-500'
                }`}
                style={{ width: `${equipmentUsage}%` }}
              />
            </div>
          </div>

          {/* Practices */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <Calendar className="h-3.5 w-3.5" />
                Practices
              </span>
              <span className="text-[var(--text-secondary)]">
                {practiceCount} (unlimited)
              </span>
            </div>
            <div className="h-2 bg-[var(--surface-2)] rounded-full">
              <div className="h-full w-0 rounded-full bg-teal-500" />
            </div>
          </div>
        </div>

        {/* Warning if approaching limits */}
        {(memberUsage > 80 || equipmentUsage > 80) && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              This club is approaching usage limits. Consider upgrading the plan or contacting facility admin.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-2)]">
        <p className="text-xs text-[var(--text-muted)]">
          Subscription management is handled at the facility level. Contact facility admin for changes.
        </p>
      </div>
    </div>
  );
}
