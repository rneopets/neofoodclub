import React, { useCallback } from 'react';

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
      memoizedCalculations.clearCache('usedProb_');
      memoizedCalculations.clearCache('logitProb_');
      memoizedCalculations.clearCache('legacyProb');
    }, [betIndex, arenaIndex, pirateIndex, updateSinglePirate]);

    const value = `${arenaIndex}-${pirateIndex}`;
    const currentValue = isSelected ? value : '';

    return (
      <RadioGroup value={currentValue} onValueChange={() => handleChange()}>
        <Radio value={value} size="sm" colorPalette="gray" />
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
      memoizedCalculations.clearCache('usedProb_');
      memoizedCalculations.clearCache('logitProb_');
      memoizedCalculations.clearCache('legacyProb');
    }, [betIndex, arenaIndex, updateSinglePirate]);

    const value = `${arenaIndex}-0`;
    const currentValue = isClearSelected ? value : '';

    return (
      <RadioGroup value={currentValue} onValueChange={() => handleChange()}>
        <Radio value={value} size="sm" colorPalette="gray" />
      </RadioGroup>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex && prevProps.arenaIndex === nextProps.arenaIndex,
);

ClearRadio.displayName = 'ClearRadio';

export default BetRadio;
