'use client';

import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface DashboardWithOnboardingProps {
  teamId: string;
  teamSlug: string;
  teamName: string;
  isCoach: boolean;
  children: ReactNode;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Client wrapper for dashboard content that conditionally shows onboarding
 * Only shows onboarding wizard for coaches (primary setup users)
 */
export function DashboardWithOnboarding({
  teamId,
  teamSlug,
  teamName,
  isCoach,
  children,
}: DashboardWithOnboardingProps) {
  return (
    <>
      {/* Onboarding wizard for coaches only */}
      {isCoach && (
        <OnboardingWizard
          teamId={teamId}
          teamSlug={teamSlug}
          teamName={teamName}
        />
      )}
      {/* Dashboard content */}
      {children}
    </>
  );
}
