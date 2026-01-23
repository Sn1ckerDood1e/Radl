'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Facility {
  id: string;
  name: string;
  slug: string;
  isFacilityAdmin: boolean;
}

interface Club {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  roles: string[];
}

interface CurrentContext {
  viewMode: 'facility' | 'club' | null;
  facilityId: string | null;
  clubId: string | null;
}

interface AvailableContextsResponse {
  facility?: Facility;
  clubs: Club[];
  currentContext: CurrentContext;
}

interface ContextSwitcherProps {
  initialContexts?: AvailableContextsResponse;
}

/**
 * Context switcher dropdown supporting facility-level and club-level views.
 *
 * Features:
 * - Shows facility option at top for FACILITY_ADMIN users
 * - Shows clubs underneath with role badges
 * - Handles context switch with JWT refresh and cache invalidation
 * - Current selection indicated with checkmark
 */
export function ContextSwitcher({ initialContexts }: ContextSwitcherProps) {
  const router = useRouter();
  const [contexts, setContexts] = useState<AvailableContextsResponse | null>(
    initialContexts ?? null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialContexts);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch contexts if not hydrated
  useEffect(() => {
    if (initialContexts) return;

    async function fetchContexts() {
      try {
        const response = await fetch('/api/context/available');
        if (response.ok) {
          const data = await response.json();
          setContexts(data);
        }
      } catch (error) {
        console.error('Failed to fetch contexts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContexts();
  }, [initialContexts]);

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

  /**
   * Handle context switch to facility or club view.
   */
  async function handleSwitch(type: 'facility' | 'club', clubId?: string) {
    if (!contexts?.facility) return;
    if (isSwitching) return;

    // Check if already in this context
    const { viewMode, clubId: currentClubId } = contexts.currentContext;
    if (type === 'facility' && viewMode === 'facility') return;
    if (type === 'club' && clubId === currentClubId) return;

    setIsSwitching(true);
    try {
      const body =
        type === 'facility'
          ? { facilityId: contexts.facility.id }
          : { facilityId: contexts.facility.id, clubId };

      const response = await fetch('/api/context/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Switch failed');
      }

      const data = await response.json();

      // Refresh JWT to update claims
      const supabase = createClient();
      await supabase.auth.refreshSession();

      // Navigate with full page reload to ensure cookies are read fresh
      const newPath =
        data.viewMode === 'facility'
          ? `/facility/${contexts.facility.slug}`
          : `/${data.club.slug}`;

      setIsOpen(false);
      // Use window.location for full reload to ensure cookies are read correctly
      window.location.href = newPath;
    } catch (error) {
      console.error('Context switch failed:', error);
    } finally {
      setIsSwitching(false);
    }
  }

  // Derive current display name
  function getCurrentDisplayName(): string {
    if (!contexts) return '';

    const { viewMode, clubId } = contexts.currentContext;

    if (viewMode === 'facility' && contexts.facility) {
      return contexts.facility.name;
    }

    const currentClub = contexts.clubs.find((c) => c.id === clubId);
    return currentClub?.name ?? contexts.clubs[0]?.name ?? '';
  }

  // Get current club for avatar display
  function getCurrentClub(): Club | undefined {
    if (!contexts) return undefined;

    const { viewMode, clubId } = contexts.currentContext;

    // In facility view, no club avatar
    if (viewMode === 'facility') return undefined;

    return contexts.clubs.find((c) => c.id === clubId) ?? contexts.clubs[0];
  }

  // Loading state
  if (isLoading) {
    return <div className="h-9 w-32 bg-[var(--surface-2)] rounded animate-pulse" />;
  }

  // No contexts
  if (!contexts || contexts.clubs.length === 0) {
    return null;
  }

  const currentClub = getCurrentClub();
  const isFacilityView = contexts.currentContext.viewMode === 'facility';
  const hasFacilityOption = contexts.facility?.isFacilityAdmin;

  // Single club and no facility admin - just show name, no dropdown
  if (contexts.clubs.length === 1 && !hasFacilityOption) {
    return (
      <div className="flex items-center gap-2">
        {currentClub?.logoUrl ? (
          <img
            src={currentClub.logoUrl}
            alt={currentClub.name}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <div
            className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: currentClub?.primaryColor }}
          >
            {currentClub?.name.charAt(0)}
          </div>
        )}
        <span className="font-medium text-[var(--text-primary)]">{currentClub?.name}</span>
      </div>
    );
  }

  // Multiple options - show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
      >
        {isFacilityView ? (
          // Facility view - show building icon
          <div className="h-6 w-6 rounded flex items-center justify-center bg-[var(--accent)] text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        ) : currentClub?.logoUrl ? (
          <img
            src={currentClub.logoUrl}
            alt={currentClub.name}
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <div
            className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: currentClub?.primaryColor }}
          >
            {currentClub?.name.charAt(0)}
          </div>
        )}
        <span className="font-medium text-[var(--text-primary)]">{getCurrentDisplayName()}</span>
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
        <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg shadow-lg z-50">
          <div className="py-1">
            {/* Facility option (if user is facility admin) */}
            {hasFacilityOption && contexts.facility && (
              <>
                <button
                  onClick={() => handleSwitch('facility')}
                  disabled={isSwitching}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--surface-2)] transition-colors ${
                    isFacilityView ? 'bg-[var(--surface-2)]' : ''
                  }`}
                >
                  <div className="h-8 w-8 rounded flex items-center justify-center bg-[var(--accent)] text-white flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {contexts.facility.name}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Facility View</div>
                  </div>
                  {isFacilityView && (
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
                {/* Separator */}
                <div className="border-t border-[var(--border)] my-1" />
              </>
            )}

            {/* Club options */}
            {contexts.clubs.map((club) => (
              <button
                key={club.id}
                onClick={() => handleSwitch('club', club.id)}
                disabled={isSwitching}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--surface-2)] transition-colors ${
                  !isFacilityView && club.id === contexts.currentContext.clubId
                    ? 'bg-[var(--surface-2)]'
                    : ''
                }`}
              >
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: club.primaryColor }}
                  >
                    {club.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">{club.name}</div>
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
                {!isFacilityView && club.id === contexts.currentContext.clubId && (
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
