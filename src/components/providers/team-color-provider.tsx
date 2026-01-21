'use client';

import { createContext, useContext, useEffect } from 'react';

interface TeamColors {
  primaryColor: string;
  secondaryColor: string;
}

interface TeamColorContextType {
  primaryColor: string;
  secondaryColor: string;
}

const TeamColorContext = createContext<TeamColorContextType>({
  primaryColor: '#10b981',
  secondaryColor: '#6ee7b7',
});

interface TeamColorProviderProps {
  children: React.ReactNode;
  colors: TeamColors;
}

export function TeamColorProvider({ children, colors }: TeamColorProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--team-primary', colors.primaryColor);
    root.style.setProperty('--team-secondary', colors.secondaryColor);
  }, [colors.primaryColor, colors.secondaryColor]);

  return (
    <TeamColorContext.Provider value={colors}>
      {children}
    </TeamColorContext.Provider>
  );
}

export function useTeamColors() {
  return useContext(TeamColorContext);
}
