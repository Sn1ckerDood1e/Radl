'use client';

import Link from 'next/link';

interface AthleteProfile {
  id: string;
  displayName: string | null;
  sidePreference: 'PORT' | 'STARBOARD' | 'BOTH' | null;
  canBow: boolean;
  canCox: boolean;
  photoUrl: string | null;
}

interface AthleteCardProps {
  id: string;
  userId: string;
  role: 'FACILITY_ADMIN' | 'CLUB_ADMIN' | 'COACH' | 'ATHLETE' | 'PARENT';
  profile: AthleteProfile | null;
  teamSlug: string;
  email?: string;
}

export function AthleteCard({ id, role, profile, teamSlug, email }: AthleteCardProps) {
  // Get display name or fall back to email prefix
  const displayName = profile?.displayName || (email ? email.split('@')[0] : 'Unknown');

  // Get initials for avatar
  const initials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format side preference
  const sideDisplay = profile?.sidePreference ? {
    PORT: 'Port',
    STARBOARD: 'Starboard',
    BOTH: 'Both',
  }[profile.sidePreference] : null;

  // Role badge styles - dark theme
  const roleBadgeStyles: Record<AthleteCardProps['role'], string> = {
    FACILITY_ADMIN: 'bg-red-500/20 text-red-400',
    CLUB_ADMIN: 'bg-orange-500/20 text-orange-400',
    COACH: 'bg-purple-500/20 text-purple-400',
    ATHLETE: 'bg-blue-500/20 text-blue-400',
    PARENT: 'bg-green-500/20 text-green-400',
  };

  return (
    <Link
      href={`/${teamSlug}/roster/${id}`}
      className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {profile?.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={displayName}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-700"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-semibold text-zinc-300 ring-2 ring-zinc-700">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-white truncate">{displayName}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeStyles[role]}`}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </span>
          </div>

          {/* Athlete-specific info */}
          {role === 'ATHLETE' && (
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              {/* Side preference */}
              {sideDisplay ? (
                <span className="text-sm text-zinc-400">
                  {sideDisplay}
                </span>
              ) : (
                <span className="text-sm text-zinc-500">Side not set</span>
              )}

              {/* Capability badges */}
              {profile?.canBow && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Can bow
                </span>
              )}
              {profile?.canCox && (
                <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-400">
                  Can cox
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chevron indicator */}
        <svg
          className="h-5 w-5 text-zinc-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
