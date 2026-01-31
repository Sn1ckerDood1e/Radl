interface AdminHeaderProps {
  userEmail: string;
}

/**
 * Admin header with branding and user info.
 *
 * Shows:
 * - Radl Admin branding with Super Admin badge
 * - Current user email
 */
export function AdminHeader({ userEmail }: AdminHeaderProps) {
  return (
    <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[var(--text-primary)]">Radl Admin</span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-600/20 text-teal-400 border border-teal-600/30">
          Super Admin
        </span>
      </div>
      <div className="text-sm text-[var(--text-muted)]">
        {userEmail}
      </div>
    </header>
  );
}
