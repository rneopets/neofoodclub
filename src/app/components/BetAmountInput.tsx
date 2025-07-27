import React, { useState, useEffect, useCallback } from 'react';

import { useOptimizedBetAmount, useUpdateSingleBetAmount } from '../stores';

import {
  NumberInputRoot,
  NumberInputField,
  type NumberInputValueChangeDetails,
} from '@/components/ui/number-input';

interface BetAmountInputProps {
  betIndex: number;
  invalid?: boolean;
  errorColor?: string;
}

const BetAmountInput = React.memo(
  (props: BetAmountInputProps): React.ReactElement => {
    const { betIndex, invalid, errorColor: _errorColor, ...rest } = props;

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

    const handleChange = useCallback((details: NumberInputValueChangeDetails): void => {
      setTempValue(details.value);
      setIsEditing(true);
    }, []);
    ``;
    return (
      <NumberInputRoot
        size="sm"
        value={tempValue}
        onValueChange={handleChange}
        min={-1000}
        max={500_000}
        allowMouseWheel
        width="90px"
        invalid={invalid ?? false}
        name={`bet-amount-input-${betIndex}`}
        data-testid={`bet-amount-input-${betIndex}`}
        {...rest}
      >
        <NumberInputField
          name={`bet-amount-input-field-${betIndex}`}
          data-testid={`bet-amount-input-field-${betIndex}`}
        />
      </NumberInputRoot>
    );
  },
  // Custom comparison function - only re-render if relevant props change
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex &&
    prevProps.invalid === nextProps.invalid &&
    prevProps.errorColor === nextProps.errorColor,
);

BetAmountInput.displayName = 'BetAmountInput';

export default BetAmountInput;
