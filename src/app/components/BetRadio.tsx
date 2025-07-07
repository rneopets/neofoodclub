import { Radio, RadioProps } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';

import { useIsPirateSelected, useUpdateSinglePirate } from '../stores';
import { memoizedCalculations } from '../stores/calculationsStore';

interface BetRadioProps extends Omit<RadioProps, 'onChange'> {
  betIndex: number;
  arenaIndex: number;
  pirateIndex: number;
}

const BetRadio = React.memo(
  ({ betIndex, arenaIndex, pirateIndex, ...rest }: BetRadioProps): React.ReactElement => {
    const isSelected = useIsPirateSelected(betIndex, arenaIndex, pirateIndex);
    const updateSinglePirate = useUpdateSinglePirate();

    const handleChange = useCallback(() => {
      updateSinglePirate(betIndex, arenaIndex, pirateIndex);
      // Only clear cache for probability-related calculations, not everything
      memoizedCalculations.clearCache('usedProb_');
      memoizedCalculations.clearCache('logitProb_');
      memoizedCalculations.clearCache('legacyProb');
    }, [betIndex, arenaIndex, pirateIndex, updateSinglePirate]);

    // Stabilize value and name props
    const radioProps = useMemo(
      () => ({
        value: pirateIndex.toString(),
        name: `bet-${betIndex}-arena-${arenaIndex}`,
        isChecked: isSelected,
        onChange: handleChange,
      }),
      [betIndex, arenaIndex, pirateIndex, isSelected, handleChange],
    );

    return <Radio {...radioProps} {...rest} />;
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
      // Only clear cache for probability-related calculations, not everything
      memoizedCalculations.clearCache('usedProb_');
      memoizedCalculations.clearCache('logitProb_');
      memoizedCalculations.clearCache('legacyProb');
    }, [betIndex, arenaIndex, updateSinglePirate]);

    // Stabilize value and name props
    const radioProps = useMemo(
      () => ({
        value: '0',
        name: `bet-${betIndex}-arena-${arenaIndex}`,
        isChecked: isClearSelected,
        onChange: handleChange,
      }),
      [betIndex, arenaIndex, isClearSelected, handleChange],
    );

    return <Radio {...radioProps} />;
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex && prevProps.arenaIndex === nextProps.arenaIndex,
);

ClearRadio.displayName = 'ClearRadio';

export default BetRadio;
