import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberInputProps,
} from '@chakra-ui/react';
import React, { memo } from 'react';

import { useCustomValueInput } from '../hooks/useCustomValueInput';
import { useRoundDataStore, useCustomOddsValue } from '../stores';

// this element is the number input for custom odds

interface CustomOddsInputProps extends Omit<NumberInputProps, 'onChange'> {
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

  return (
    <NumberInput
      {...rest}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      size="xs"
      min={2}
      max={13}
      allowMouseWheel
      width="80px"
      keepWithinRange={true}
      clampValueOnBlur={true}
      inputMode="numeric"
      name={`custom-odds-input-${arenaIndex}-${pirateIndex}`}
      data-testid={`custom-odds-input-${arenaIndex}-${pirateIndex}`}
    >
      <NumberInputField
        name={`custom-odds-input-field-${arenaIndex}-${pirateIndex}`}
        data-testid={`custom-odds-input-field-${arenaIndex}-${pirateIndex}`}
      />
      <NumberInputStepper width="16px">
        <NumberIncrementStepper
          data-testid={`custom-odds-input-increment-${arenaIndex}-${pirateIndex}`}
        />
        <NumberDecrementStepper
          data-testid={`custom-odds-input-decrement-${arenaIndex}-${pirateIndex}`}
        />
      </NumberInputStepper>
    </NumberInput>
  );
};

export default memo(
  CustomOddsInput,
  (prevProps, nextProps) =>
    prevProps.arenaIndex === nextProps.arenaIndex &&
    prevProps.pirateIndex === nextProps.pirateIndex,
);
