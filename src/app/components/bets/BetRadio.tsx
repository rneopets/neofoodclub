import { Box, Radiomark } from '@chakra-ui/react';
import React, { useCallback } from 'react';

import { useIsPirateSelected, useUpdateSinglePirate } from '../../stores';

interface BetRadioProps {
  betIndex: number;
  arenaIndex: number;
  pirateIndex: number;
}

function handleRadioKeyDown(e: React.KeyboardEvent, onActivate: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onActivate();
  }
}

const BetRadio = React.memo(
  ({ betIndex, arenaIndex, pirateIndex }: BetRadioProps): React.ReactElement => {
    const isSelected = useIsPirateSelected(betIndex, arenaIndex, pirateIndex);
    const updateSinglePirate = useUpdateSinglePirate();

    const handleChange = useCallback(() => {
      updateSinglePirate(betIndex, arenaIndex, pirateIndex);
    }, [betIndex, arenaIndex, pirateIndex, updateSinglePirate]);

    return (
      <Box
        as="button"
        type="button"
        onClick={handleChange}
        onKeyDown={e => handleRadioKeyDown(e, handleChange)}
        role="radio"
        aria-checked={isSelected}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        p={0}
        bg="transparent"
        border="none"
        cursor="pointer"
        css={{
          '& *': { cursor: 'pointer' },
        }}
      >
        <Radiomark checked={isSelected} size="sm" cursor="pointer" />
      </Box>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex &&
    prevProps.arenaIndex === nextProps.arenaIndex &&
    prevProps.pirateIndex === nextProps.pirateIndex,
);

BetRadio.displayName = 'BetRadio';

export const ClearRadio = React.memo(
  ({ betIndex, arenaIndex }: { betIndex: number; arenaIndex: number }): React.ReactElement => {
    const isClearSelected = useIsPirateSelected(betIndex, arenaIndex, 0);
    const updateSinglePirate = useUpdateSinglePirate();

    const handleChange = useCallback(() => {
      updateSinglePirate(betIndex, arenaIndex, 0);
    }, [betIndex, arenaIndex, updateSinglePirate]);

    return (
      <Box
        as="button"
        type="button"
        onClick={handleChange}
        onKeyDown={e => handleRadioKeyDown(e, handleChange)}
        role="radio"
        aria-checked={isClearSelected}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        p={0}
        bg="transparent"
        border="none"
        cursor="pointer"
        css={{
          '& *': { cursor: 'pointer' },
        }}
      >
        <Radiomark checked={isClearSelected} size="sm" cursor="pointer" />
      </Box>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex && prevProps.arenaIndex === nextProps.arenaIndex,
);

ClearRadio.displayName = 'ClearRadio';

export default BetRadio;
