'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Club {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  roles: string[];
  isCurrent: boolean;
}

interface ClubSwitcherProps {
  initialClubs?: Club[];
  currentClubId?: string;
}

/**
 * Club switcher dropdown for multi-club users.
 *
 * Features:
 * - Shows current club name/logo
 * - Dropdown with all clubs and role badges
 * - Switches club via API and refreshes page
 * - Single-club users just see club name (no dropdown)
 */
export function ClubSwitcher({ initialClubs, currentClubId }: ClubSwitcherProps) {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>(initialClubs ?? []);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialClubs);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentClub = clubs.find((c) => c.id === currentClubId) ?? clubs[0];

  // Fetch clubs if not provided
  useEffect(() => {
    if (initialClubs) return;

    async function fetchClubs() {
      try {
        const response = await fetch('/api/clubs');
        if (response.ok) {
          const data = await response.json();
          setClubs(data.clubs);
        }
      } catch (error) {
        console.error('Failed to fetch clubs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClubs();
  }, [initialClubs]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSwitch(clubId: string) {
    if (clubId === currentClubId || isSwitching) return;

    setIsSwitching(true);
    try {
      const response = await fetch('/api/clubs/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsOpen(false);
        // Navigate to new club's dashboard and refresh all data
        router.push(`/${data.club.slug}`);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to switch club:', error);
    } finally {
      setIsSwitching(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-9 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
    );
  }

  // No clubs
  if (clubs.length === 0) {
    return null;
  }

  // Single club - just show name, no dropdown
  if (clubs.length === 1) {
    return (
      <div className="flex items-center gap-2">
        {currentClub?.logoUrl ? (
          <img
            src={currentClub.logoUrl}
            alt={currentClub.name}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <div className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white bg-emerald-600">
            {currentClub?.name.charAt(0)}
          </div>
        )}
        <span className="font-medium text-[var(--text-primary)]">
          {currentClub?.name}
        </span>
      </div>
    );
  }

  // Multiple clubs - show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
      >
        {currentClub?.logoUrl ? (
          <img
            src={currentClub.logoUrl}
            alt={currentClub.name}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <div className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white bg-emerald-600">
            {currentClub?.name.charAt(0)}
          </div>
        )}
        <span className="font-medium text-[var(--text-primary)]">
          {currentClub?.name}
        </span>
        <svg
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg shadow-lg z-50">
          <div className="py-1">
            {clubs.map((club) => (
              <button
                key={club.id}
                onClick={() => handleSwitch(club.id)}
                disabled={isSwitching}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--surface-2)] transition-colors ${
                  club.id === currentClubId ? 'bg-[var(--surface-2)]' : ''
                }`}
              >
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-emerald-600">
                    {club.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">
                    {club.name}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {club.roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-muted)]"
                      >
                        {formatRole(role)}
                      </span>
                    ))}
                  </div>
                </div>
                {club.id === currentClubId && (
                  <svg
                    className="w-4 h-4 text-[var(--accent)] flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format role name for display.
 */
function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
