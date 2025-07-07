import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputProps,
  NumberInputStepper,
} from '@chakra-ui/react';
import React, { useState, useEffect, useCallback } from 'react';

import { useOptimizedBetAmount, useUpdateSingleBetAmount } from '../stores';

interface BetAmountInputProps extends Omit<NumberInputProps, 'onChange'> {
  betIndex: number;
  [key: string]: unknown;
}

const BetAmountInput = React.memo(
  (props: BetAmountInputProps): React.ReactElement => {
    const { betIndex, isInvalid, errorBorderColor, ...rest } = props;

    // Use optimized hook that only subscribes to this specific bet amount
    const betAmount = useOptimizedBetAmount(betIndex);
    const updateSingleBetAmount = useUpdateSingleBetAmount();

    const [tempValue, setTempValue] = useState(betAmount.toString());
    const [isEditing, setIsEditing] = useState(false);

    // Update temp value when bet amount changes externally (but not when editing)
    useEffect(() => {
      if (!isEditing) {
        setTempValue(betAmount.toString());
      }
    }, [betAmount, isEditing]);

    // Debounced update when temp value changes
    useEffect(() => {
      if (tempValue === '' || !isEditing) {
        return;
      }

      const numValue = parseInt(tempValue) || 0;

      // Only update if the value actually changed
      if (numValue === betAmount) {
        return;
      }

      // TODO: optimize this so it's instant
      const timeoutId = setTimeout(() => {
        updateSingleBetAmount(betIndex, numValue);
        setIsEditing(false);
      }, 400);

      return (): void => {
        clearTimeout(timeoutId);
      };
    }, [tempValue, updateSingleBetAmount, betIndex, betAmount, isEditing]);

    const handleChange = useCallback((value: string): void => {
      setTempValue(value);
      setIsEditing(true);
    }, []);

    const handleBlur = useCallback((): void => {
      setIsEditing(false);
      let numValue = parseInt(tempValue) || -1000;
      if (numValue < 1) {
        numValue = -1000;
      }
      if (numValue !== betAmount) {
        updateSingleBetAmount(betIndex, numValue);
      }
    }, [tempValue, betAmount, updateSingleBetAmount, betIndex]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
      e.target.select();
      setIsEditing(true);
    }, []);

    return (
      <NumberInput
        size="sm"
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        min={-1000}
        max={500_000}
        allowMouseWheel
        width="90px"
        isInvalid={isInvalid ?? false}
        {...(errorBorderColor && { errorBorderColor })}
        name={`bet-amount-input-${betIndex}`}
        data-testid={`bet-amount-input-${betIndex}`}
        {...rest}
      >
        <NumberInputField
          name={`bet-amount-input-field-${betIndex}`}
          data-testid={`bet-amount-input-field-${betIndex}`}
        />
        <NumberInputStepper width="16px">
          <NumberIncrementStepper data-testid={`bet-amount-input-increment-${betIndex}`} />
          <NumberDecrementStepper data-testid={`bet-amount-input-decrement-${betIndex}`} />
        </NumberInputStepper>
      </NumberInput>
    );
  },
  // Custom comparison function - only re-render if relevant props change
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex &&
    prevProps.isInvalid === nextProps.isInvalid &&
    prevProps.errorBorderColor === nextProps.errorBorderColor,
);

BetAmountInput.displayName = 'BetAmountInput';

export default BetAmountInput;
