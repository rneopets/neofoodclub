import { Button } from '@chakra-ui/react';
import React, { useCallback } from 'react';

import { useBetManagementStore } from '../stores';

// Isolated Button that only re-renders when disabled changes
const ClearButtonComponent = React.memo(
  ({
    onClick,
    ...rest
  }: { onClick: () => void } & Omit<
    React.ComponentProps<typeof Button>,
    'onClick'
  >): React.ReactElement => (
    <Button size="xs" onClick={onClick} {...rest}>
      Clear
    </Button>
  ),
);

ClearButtonComponent.displayName = 'ClearButtonComponent';

// Wrapper component that connects to the store and passes only required props
const ClearBetsButton = React.memo(
  (props: Omit<React.ComponentProps<typeof Button>, 'onClick'>): React.ReactElement => {
    // Get whether any bets exist directly from the store
    const hasAnyBets =
      useBetManagementStore(state => {
        const currentBets = state.allBets.get(state.currentBet);
        return currentBets
          ? Array.from(currentBets.values()).some(bet => bet.some(pirate => pirate > 0))
          : false;
      }) ?? false;

    // Get the clearBets function from the store
    const clearBets = useCallback(() => {
      const store = useBetManagementStore.getState();

      // Get current state
      const currentBetIndex = store.currentBet;
      const currentBets = store.allBets.get(currentBetIndex);
      if (!currentBets) {
        return;
      }

      const betCount = currentBets.size;

      // Clear bets - using the store functions directly
      store.setAllBets(prevBets => {
        const newMap = new Map(prevBets);
        newMap.set(
          currentBetIndex,
          new Map([...Array(betCount)].map((_, i) => [i + 1, [0, 0, 0, 0, 0]])),
        );
        return newMap;
      });

      // Clear bet amounts
      store.setAllBetAmounts(prevAmounts => {
        const newMap = new Map(prevAmounts);
        newMap.set(currentBetIndex, new Map([...Array(betCount)].map((_, i) => [i + 1, -1000])));
        return newMap;
      });

      // Clear the bet name
      store.setAllNames(prevNames => {
        const newMap = new Map(prevNames);
        newMap.set(currentBetIndex, '');
        return newMap;
      });
    }, []);

    return <ClearButtonComponent disabled={!hasAnyBets} onClick={clearBets} {...props} />;
  },
);

ClearBetsButton.displayName = 'ClearBetsButton';

export default ClearBetsButton;
