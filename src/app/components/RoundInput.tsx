import {
  InputGroup,
  InputLeftAddon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from '@chakra-ui/react';
import { useEffect, useState, FocusEvent, useMemo, useCallback } from 'react';

import { useRoundDataStore } from '../stores';

// this element is the number input to say which round's data you're viewing

const RoundInput: React.FC = () => {
  const currentSelectedRound = useRoundDataStore(state => state.roundState.currentSelectedRound);
  const currentRound = useRoundDataStore(state => state.roundState.currentRound);
  const updateSelectedRound = useRoundDataStore(state => state.updateSelectedRound);

  const initialRoundNumber = useMemo(() => currentSelectedRound || 0, [currentSelectedRound]);

  const [roundNumber, setRoundNumber] = useState<number>(initialRoundNumber);
  const [hasFocus, setHasFocus] = useState<boolean>(false);

  useEffect(() => {
    if (roundNumber === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const value = roundNumber;

      const isSameRound = value === currentSelectedRound;

      if (isSameRound) {
        return;
      }

      // Use the new updateSelectedRound action which handles data fetching automatically
      updateSelectedRound(value);
    }, 400);

    return (): void => {
      clearTimeout(timeoutId);
    };
  }, [roundNumber, currentSelectedRound, updateSelectedRound]);

  useEffect(() => {
    setRoundNumber(currentSelectedRound || 0);
  }, [currentSelectedRound]);

  const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>): void => {
    setHasFocus(true);
    e.target.select();
  }, []);

  const handleChange = useCallback((valueAsString: string): void => {
    if (valueAsString === '') {
      setRoundNumber(0);
      return;
    }

    const value = parseInt(valueAsString);
    if (!isNaN(value) && value > 0) {
      setRoundNumber(value);
    }
  }, []);

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>): void => {
      setHasFocus(false);
      if (e.target.value === '') {
        setRoundNumber(currentRound);
      }
    },
    [currentRound],
  );

  return (
    <InputGroup size="xs">
      <InputLeftAddon children="Round" />
      <NumberInput
        value={roundNumber === 0 ? '' : roundNumber}
        min={1}
        allowMouseWheel
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        width="100px"
        name="round-input"
        data-testid="round-input"
      >
        <NumberInputField name="round-input-field" data-testid="round-input-field" />
        {hasFocus && (
          <NumberInputStepper width="16px">
            <NumberIncrementStepper data-testid="round-input-increment" />
            <NumberDecrementStepper data-testid="round-input-decrement" />
          </NumberInputStepper>
        )}
      </NumberInput>
    </InputGroup>
  );
};

export default RoundInput;
