import React, { useCallback, useMemo } from 'react';

import { useIsPirateSelected, useUpdateSinglePirate } from '../stores';
import { memoizedCalculations } from '../stores/calculationsStore';

import { Radio, RadioGroup } from '@/components/ui/radio';

interface BetRadioProps {
  betIndex: number;
  arenaIndex: number;
  pirateIndex: number;
}

const BetRadio = React.memo(
  ({ betIndex, arenaIndex, pirateIndex }: BetRadioProps): React.ReactElement => {
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
        checked: isSelected,
        onChange: handleChange,
      }),
      [betIndex, arenaIndex, pirateIndex, isSelected, handleChange],
    );

    return (
      <RadioGroup>
        <Radio {...radioProps} />
      </RadioGroup>
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
        checked: isClearSelected,
        onChange: handleChange,
      }),
      [betIndex, arenaIndex, isClearSelected, handleChange],
    );

    return (
      <RadioGroup>
        <Radio {...radioProps} />
      </RadioGroup>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex && prevProps.arenaIndex === nextProps.arenaIndex,
);

ClearRadio.displayName = 'ClearRadio';

export default BetRadio;
