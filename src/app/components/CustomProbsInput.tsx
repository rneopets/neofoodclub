import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from '@chakra-ui/react';
import React, { memo } from 'react';

import { useCustomValueInput } from '../hooks/useCustomValueInput';
import { useRoundDataStore, useCalculationsStore, useCustomProbsValue } from '../stores';

// this element is the number input for custom probabilities

interface CustomProbsInputProps {
  arenaIndex: number;
  pirateIndex: number;
  [key: string]: unknown;
}

// Completely isolated component that manages its own state
const CustomProbsInput = function CustomProbsInput(
  props: CustomProbsInputProps,
): React.ReactElement {
  const { arenaIndex, pirateIndex, ...rest } = props;

  // Get the current custom probs value for this specific pirate
  const customProbsValue = useCustomProbsValue(arenaIndex, pirateIndex);

  // Get the original calculated probability value for this specific pirate (before custom probabilities)
  const useLogitModel = useRoundDataStore(
    state => state.roundState.advanced?.useLogitModel ?? false,
  );
  const calculatedProbValue = useCalculationsStore(state => {
    if (useLogitModel) {
      return state.calculations.logitProbabilities?.used?.[arenaIndex]?.[pirateIndex] ?? 0;
    }
    return state.calculations.legacyProbabilities?.used?.[arenaIndex]?.[pirateIndex] ?? 0;
  });

  // Use the custom hook to handle all the input logic
  const { inputValue, handleChange, handleBlur, handleFocus } = useCustomValueInput({
    arenaIndex,
    pirateIndex,
    type: 'probs',
    customValue: customProbsValue,
    originalValue: calculatedProbValue,
    isPercent: true,
  });

  return (
    <NumberInput
      {...rest}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      size="xs"
      allowMouseWheel
      width="100px"
      inputMode="decimal"
      name={`custom-probs-input-${arenaIndex}-${pirateIndex}`}
      data-testid={`custom-probs-input-${arenaIndex}-${pirateIndex}`}
    >
      <NumberInputField
        name={`custom-probs-input-field-${arenaIndex}-${pirateIndex}`}
        data-testid={`custom-probs-input-field-${arenaIndex}-${pirateIndex}`}
      />
      <NumberInputStepper width="16px">
        <NumberIncrementStepper
          data-testid={`custom-probs-input-increment-${arenaIndex}-${pirateIndex}`}
        />
        <NumberDecrementStepper
          data-testid={`custom-probs-input-decrement-${arenaIndex}-${pirateIndex}`}
        />
      </NumberInputStepper>
    </NumberInput>
  );
};

export default memo(
  CustomProbsInput,
  // Only re-render if arena or pirate indices change
  (prevProps, nextProps) =>
    prevProps.arenaIndex === nextProps.arenaIndex &&
    prevProps.pirateIndex === nextProps.pirateIndex,
);
