import { useCustomValueInput } from '../hooks/useCustomValueInput';
import { useCalculationsStore, useRoundDataStore, useCustomProbsValue } from '../stores';

import { NumberInputRoot, NumberInputField } from '@/components/ui/number-input';

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
    <NumberInputRoot
      {...rest}
      value={inputValue}
      onValueChange={handleChange}
      size="xs"
      allowMouseWheel
      width="100px"
      inputMode="decimal"
      name={`custom-probs-input-${arenaIndex}-${pirateIndex}`}
      data-testid={`custom-probs-input-${arenaIndex}-${pirateIndex}`}
    >
      <NumberInputField
        onBlur={handleBlur}
        onFocus={handleFocus}
        name={`custom-probs-input-field-${arenaIndex}-${pirateIndex}`}
        data-testid={`custom-probs-input-field-${arenaIndex}-${pirateIndex}`}
      />
    </NumberInputRoot>
  );
};

export default CustomProbsInput;
