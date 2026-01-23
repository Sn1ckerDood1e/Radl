'use client';

import { createContext, useMemo, type ReactNode } from 'react';
import { defineAbilityFor, createEmptyAbility, type AppAbility, type UserContext } from '@/lib/permissions/ability';

/**
 * Context for CASL ability instance.
 * Provides ability to all child components via useAbility hook and Can component.
 */
export const AbilityContext = createContext<AppAbility | null>(null);

/**
 * Props for AbilityProvider.
 * User context comes from server (passed from layout or page).
 */
export interface AbilityProviderProps {
  children: ReactNode;
  user: UserContext | null;
}

/**
 * Provides CASL ability to all child components.
 *
 * Usage in layout:
 * ```tsx
 * <AbilityProvider user={{ userId, clubId, roles }}>
 *   {children}
 * </AbilityProvider>
 * ```
 *
 * User context should come from server-side auth.
 * When user is null, an empty ability (no permissions) is created.
 */
export function AbilityProvider({ children, user }: AbilityProviderProps) {
  // Memoize ability to avoid recreating on every render
  const ability = useMemo(() => {
    if (!user) {
      return createEmptyAbility();
    }
    return defineAbilityFor(user);
  }, [user]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
