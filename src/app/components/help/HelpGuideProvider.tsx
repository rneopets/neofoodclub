import * as React from 'react';

import { useDisclosureState } from '../../hooks/useDisclosureState';

import { HelpGuideModal, type HelpGuideTab } from './HelpGuideModal';

interface HelpGuideContextValue {
  openHelpGuide: (tab?: HelpGuideTab, entryId?: string) => void;
}

const HelpGuideContext = React.createContext<HelpGuideContextValue | null>(null);

export function useHelpGuide(): HelpGuideContextValue {
  const ctx = React.useContext(HelpGuideContext);
  if (!ctx) {
    throw new Error('useHelpGuide must be used within HelpGuideProvider');
  }
  return ctx;
}

export const HelpGuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosureState();
  const [initialTab, setInitialTab] = React.useState<HelpGuideTab>('glossary');
  const [initialEntryId, setInitialEntryId] = React.useState<string | undefined>();

  const openHelpGuide = React.useCallback(
    (tab: HelpGuideTab = 'glossary', entryId?: string) => {
      setInitialTab(tab);
      setInitialEntryId(entryId);
      onOpen();
    },
    [onOpen],
  );

  const value = React.useMemo(() => ({ openHelpGuide }), [openHelpGuide]);

  return (
    <HelpGuideContext.Provider value={value}>
      {children}
      <HelpGuideModal
        isOpen={isOpen}
        onClose={onClose}
        initialTab={initialTab}
        {...(initialEntryId !== undefined ? { initialEntryId } : {})}
      />
    </HelpGuideContext.Provider>
  );
};
