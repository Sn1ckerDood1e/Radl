'use client';

import { useContext } from 'react';
import { AbilityContext } from '@/components/permissions/ability-provider';
import { createEmptyAbility, type AppAbility } from '@/lib/permissions/ability';

/**
 * Hook to access CASL ability instance.
 *
 * Returns empty ability if used outside AbilityProvider (safe default).
 *
 * Usage:
 * ```tsx
 * function PracticeActions() {
 *   const ability = useAbility();
 *
 *   if (ability.can('create', 'Practice')) {
 *     return <CreateButton />;
 *   }
 *
 *   return null;
 * }
 * ```
 *
 * For conditional rendering, prefer Can component for clarity.
 * Use useAbility when you need:
 * - Complex permission logic
 * - Multiple permission checks in one component
 * - Permission-dependent data fetching
 */
export function useAbility(): AppAbility {
  const ability = useContext(AbilityContext);

  // Return empty ability if context not available
  // This prevents crashes when component is outside provider
  if (!ability) {
    return createEmptyAbility();
  }

  return ability;
}
