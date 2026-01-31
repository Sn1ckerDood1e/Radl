import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  email: string | undefined;
  displayName: string | undefined;
  phone: string | undefined;
  createdAt: string;
  lastSignInAt: string | undefined;
  isBanned: boolean;
  emailConfirmed: boolean;
}

interface UserDetailCardProps {
  user: User;
}

/**
 * Card displaying user profile information.
 *
 * Shows:
 * - Display name (or "No Name")
 * - Status badge (Active/Deactivated)
 * - Email, phone, created date, last sign in
 * - Email verification status
 * - User ID (for debugging)
 */
export function UserDetailCard({ user }: UserDetailCardProps) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {user.displayName || 'No Name'}
        </h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.isBanned
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {user.isBanned ? 'Deactivated' : 'Active'}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[var(--text-muted)]">Email</dt>
          <dd className="font-medium text-[var(--text-primary)]">{user.email || '-'}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Phone</dt>
          <dd className="font-medium text-[var(--text-primary)]">{user.phone || '-'}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Created</dt>
          <dd className="font-medium text-[var(--text-primary)]">
            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Last Sign In</dt>
          <dd className="font-medium text-[var(--text-primary)]">
            {user.lastSignInAt
              ? formatDistanceToNow(new Date(user.lastSignInAt), { addSuffix: true })
              : 'Never'}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Email Verified</dt>
          <dd className="font-medium text-[var(--text-primary)]">
            {user.emailConfirmed ? 'Yes' : 'No'}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">User ID</dt>
          <dd className="font-mono text-xs text-[var(--text-secondary)]">{user.id}</dd>
        </div>
      </dl>
    </div>
  );
}
