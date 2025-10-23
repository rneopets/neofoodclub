import { Button } from '@chakra-ui/react';
import React, { useCallback } from 'react';

import { useBetStore } from '../stores';

// Isolated Button that only re-renders when disabled changes
const ClearButtonComponent = React.memo(
  ({
    onClick,
    ...rest
  }: { onClick: () => void } & Omit<
    React.ComponentProps<typeof Button>,
    'onClick'
  >): React.ReactElement => (
    <Button size="2xs" onClick={onClick} layerStyle="fill.solid" colorPalette="red" {...rest}>
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
      useBetStore(state => {
        const currentBets = state.allBets.get(state.currentBet);
        return currentBets
          ? Array.from(currentBets.values()).some(bet => bet.some(pirate => pirate > 0))
          : false;
      }) ?? false;

    // Get the clearBets function from the store
    const clearBets = useCallback(() => {
      const store = useBetStore.getState();
      store.clearAllBets();
    }, []);

    return <ClearButtonComponent disabled={!hasAnyBets} onClick={clearBets} {...props} />;
  },
);

ClearBetsButton.displayName = 'ClearBetsButton';

export default ClearBetsButton;
