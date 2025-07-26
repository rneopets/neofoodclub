import { InputGroup, NumberInputControl } from '@chakra-ui/react';
import { useEffect, useState, FocusEvent, useMemo, useCallback } from 'react';

import { useRoundDataStore } from '../stores';

import {
  NumberInputRoot,
  NumberInputField,
  NumberInputValueChangeDetails,
} from '@/components/ui/number-input';

// this element is the number input to say which round's data you're viewing

const RoundInput: React.FC = () => {
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
  const currentRound = useRoundDataStore(state => state.roundState.currentRound);
  const updateSelectedRound = useRoundDataStore(state => state.updateSelectedRound);

  const initialRoundNumber = useMemo(() => currentSelectedRound || 0, [currentSelectedRound]);

  const [tempValue, setTempValue] = useState<string>(initialRoundNumber.toString());

  useEffect(() => {
    const trimmedValue = tempValue.trim();
    if (trimmedValue === '') {
      return;
    }

    const roundNumber = parseInt(trimmedValue, 10);
    if (isNaN(roundNumber) || roundNumber === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const isSameRound = roundNumber === currentSelectedRound;

      if (isSameRound) {
        return;
      }

      // Use the new updateSelectedRound action which handles data fetching automatically
      updateSelectedRound(roundNumber);
    }, 400);

    return (): void => {
      clearTimeout(timeoutId);
    };
  }, [tempValue, currentSelectedRound, updateSelectedRound]);

  useEffect(() => {
    setTempValue((currentSelectedRound || 0).toString());
  }, [currentSelectedRound]);

  const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>): void => {
    e.target.select();
  }, []);

  const handleChange = useCallback((details: NumberInputValueChangeDetails): void => {
    setTempValue(details.value);
  }, []);

  const handleBlur = useCallback((): void => {
    const trimmedValue = tempValue.trim();

    // If input is empty, set to current round
    if (trimmedValue === '') {
      setTempValue(currentRound.toString());
      return;
    }

    const roundNumber = parseInt(trimmedValue, 10);

    // If invalid number, revert to current round
    if (isNaN(roundNumber) || roundNumber < 1) {
      setTempValue(currentRound.toString());
      return;
    }

    // Update the display value to the parsed number
    setTempValue(roundNumber.toString());
  }, [tempValue, currentRound]);

  return (
    <InputGroup>
      <NumberInputRoot
        value={tempValue}
        min={1}
        allowMouseWheel
        onValueChange={handleChange}
        name="round-input"
        data-testid="round-input"
        size="xs"
      >
        <NumberInputField
          onFocus={handleFocus}
          onBlur={handleBlur}
          name="round-input-field"
          data-testid="round-input-field"
        />
        <NumberInputControl />
      </NumberInputRoot>
    </InputGroup>
  );
};

export default RoundInput;
