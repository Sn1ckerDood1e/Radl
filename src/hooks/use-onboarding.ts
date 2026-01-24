'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface OnboardingState {
  /** True if onboarding has been completed */
  completed: boolean;
  /** Current step (1-4) */
  currentStep: number;
  /** True if onboarding was skipped */
  skipped: boolean;
  /** ISO timestamp when completed or skipped */
  completedAt: string | null;
}

export interface UseOnboardingReturn {
  /** Current state (null during SSR/initial load) */
  state: OnboardingState | null;
  /** True if still loading from localStorage */
  isLoading: boolean;
  /** Computed: true if onboarding should be shown */
  showOnboarding: boolean;
  /** Move to next step */
  nextStep: () => void;
  /** Move to previous step */
  prevStep: () => void;
  /** Jump to specific step */
  goToStep: (step: number) => void;
  /** Mark onboarding as complete */
  complete: () => void;
  /** Skip onboarding */
  skip: () => void;
  /** Reset onboarding state (for testing) */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const TOTAL_STEPS = 4;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get storage key for team-specific onboarding state
 */
function getStorageKey(teamId: string): string {
  return `rowops-onboarding-${teamId}`;
}

/**
 * Load onboarding state from localStorage
 */
function loadState(teamId: string): OnboardingState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(teamId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return {
      completed: parsed.completed ?? false,
      currentStep: parsed.currentStep ?? 1,
      skipped: parsed.skipped ?? false,
      completedAt: parsed.completedAt ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Save onboarding state to localStorage
 */
function saveState(teamId: string, state: OnboardingState): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(teamId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get initial state (fresh onboarding)
 */
function getInitialState(): OnboardingState {
  return {
    completed: false,
    currentStep: 1,
    skipped: false,
    completedAt: null,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing onboarding state with team-specific localStorage persistence
 *
 * Features:
 * - Team-specific storage key
 * - SSR-safe (window check, loading state)
 * - State: completed, currentStep, skipped, completedAt
 * - Actions: nextStep, prevStep, goToStep, complete, skip, reset
 * - Computed showOnboarding (not completed and not skipped)
 *
 * @example
 * ```tsx
 * const { showOnboarding, state, nextStep, complete, skip } = useOnboarding(teamId);
 *
 * if (showOnboarding) {
 *   return <OnboardingWizard currentStep={state?.currentStep} onNext={nextStep} />;
 * }
 * ```
 */
export function useOnboarding(teamId: string): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from localStorage on mount
  useEffect(() => {
    const loaded = loadState(teamId);
    setState(loaded ?? getInitialState());
    setIsLoading(false);
  }, [teamId]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (state && !isLoading) {
      saveState(teamId, state);
    }
  }, [state, isLoading, teamId]);

  // Computed: show onboarding if not completed and not skipped
  const showOnboarding = !isLoading && state !== null && !state.completed && !state.skipped;

  // Move to next step
  const nextStep = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.currentStep >= TOTAL_STEPS) return prev;
      return { ...prev, currentStep: prev.currentStep + 1 };
    });
  }, []);

  // Move to previous step
  const prevStep = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.currentStep <= 1) return prev;
      return { ...prev, currentStep: prev.currentStep - 1 };
    });
  }, []);

  // Jump to specific step
  const goToStep = useCallback((step: number) => {
    setState((prev) => {
      if (!prev || step < 1 || step > TOTAL_STEPS) return prev;
      return { ...prev, currentStep: step };
    });
  }, []);

  // Mark as complete
  const complete = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        completed: true,
        completedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Skip onboarding
  const skip = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        skipped: true,
        completedAt: new Date().toISOString(),
      };
    });
  }, []);

  // Reset onboarding (for testing)
  const reset = useCallback(() => {
    setState(getInitialState());
  }, []);

  return {
    state,
    isLoading,
    showOnboarding,
    nextStep,
    prevStep,
    goToStep,
    complete,
    skip,
    reset,
  };
}
