import React from 'react';

import { useCustomValueInput } from '../hooks/useCustomValueInput';
import { useRoundDataStore, useCustomOddsValue } from '../stores';

import { NumberInputRoot, NumberInputField } from '@/components/ui/number-input';

interface CustomOddsInputProps {
  arenaIndex: number;
  pirateIndex: number;
}

// Completely isolated component that manages its own state
const CustomOddsInput = function CustomOddsInput(props: CustomOddsInputProps): React.ReactElement {
  const { arenaIndex, pirateIndex, ...rest } = props;

  // Get the current custom odds value for this specific pirate
  const customOddsValue = useCustomOddsValue(arenaIndex, pirateIndex);

  // Get current odds from round data for this specific pirate
  const currentOddsValue = useRoundDataStore(
    state => state.roundState.roundData?.currentOdds?.[arenaIndex]?.[pirateIndex] ?? 2,
  );

  // Use the custom hook to handle all the input logic
  const { inputValue, handleChange, handleBlur, handleFocus } = useCustomValueInput({
    arenaIndex,
    pirateIndex,
    type: 'odds',
    customValue: customOddsValue,
    originalValue: currentOddsValue,
    isPercent: false,
  });

  const handleValueChange = (details: { value: string }): void => {
    handleChange(details.value);
  };

  return (
    <NumberInputRoot
      {...rest}
      value={inputValue}
      onValueChange={handleValueChange}
      size="xs"
      min={2}
      max={13}
      allowMouseWheel
      width="80px"
      keepWithinRange={true}
      clampValueOnBlur={true}
      name={`custom-odds-input-${arenaIndex}-${pirateIndex}`}
      data-testid={`custom-odds-input-${arenaIndex}-${pirateIndex}`}
      variant="subtle"
    >
      <NumberInputField
        onBlur={handleBlur}
        onFocus={handleFocus}
        name={`custom-odds-input-field-${arenaIndex}-${pirateIndex}`}
        data-testid={`custom-odds-input-field-${arenaIndex}-${pirateIndex}`}
      />
    </NumberInputRoot>
  );
};

export default CustomOddsInput;
