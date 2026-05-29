import * as React from 'react';

export type HelpGuideNavigateToEntry = (entryId: string) => void;

const HelpGuideNavigationContext = React.createContext<HelpGuideNavigateToEntry | null>(null);

export function useHelpGuideNavigation(): HelpGuideNavigateToEntry | null {
  return React.useContext(HelpGuideNavigationContext);
}

export const HelpGuideNavigationProvider = HelpGuideNavigationContext.Provider;
