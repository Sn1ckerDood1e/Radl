import Link from 'next/link';

/**
 * Onboarding page for users with no active memberships.
 *
 * Users land here when they:
 * - Have no ClubMembership or FacilityMembership records
 * - All their memberships have isActive: false
 *
 * Provides options to join an existing club or create a new one.
 */
export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="max-w-md w-full p-8 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Welcome to RowOps
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          You're not currently a member of any clubs. Please contact your club administrator to receive an invitation, or create a new club.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/clubs/join"
            className="w-full py-2 px-4 bg-[var(--accent)] text-white rounded-lg text-center font-medium hover:opacity-90 transition-opacity"
          >
            Join a Club
          </Link>
          <Link
            href="/clubs/create"
            className="w-full py-2 px-4 border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-center font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            Create a Club
          </Link>
        </div>
      </div>
    </div>
  );
}
