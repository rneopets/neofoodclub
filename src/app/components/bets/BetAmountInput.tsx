import { NumberInputControl } from '@chakra-ui/react';
import React, { useState, useEffect, useCallback } from 'react';

import { BET_AMOUNT_DEFAULT, BET_AMOUNT_MAX, BET_AMOUNT_MIN } from '../../constants';
import { useSelectOnFocus } from '../../hooks';
import { useOptimizedBetAmount, useUpdateSingleBetAmount } from '../../stores';

import {
  NumberInputRoot,
  NumberInputField,
  NumberInputValueChangeDetails,
} from '@/components/ui/number-input';

interface BetAmountInputProps
  extends Omit<React.ComponentProps<typeof NumberInputRoot>, 'value' | 'onValueChange'> {
  betIndex: number;
  invalid?: boolean;
  errorColor?: string;
}

const BetAmountInput = React.memo(
  (props: BetAmountInputProps): React.ReactElement => {
    const { betIndex, invalid, errorColor, ...rest } = props;

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

    const sanitizeToInteger = useCallback((raw: string): number => {
      const trimmed = raw.trim();
      if (trimmed === '') {
        return BET_AMOUNT_DEFAULT;
      }
      // Remove common formatting characters (commas, spaces, underscores)
      const cleaned = trimmed.replace(/[,_\s]/g, '');
      const parsed = parseInt(cleaned, 10);
      if (Number.isNaN(parsed) || parsed < BET_AMOUNT_MIN) {
        return BET_AMOUNT_DEFAULT;
      }
      // Clamp to allowed range
      return Math.min(Math.max(parsed, BET_AMOUNT_MIN), BET_AMOUNT_MAX);
    }, []);

    const handleChange = useCallback(
      (details: NumberInputValueChangeDetails): void => {
        setTempValue(details.value);
        setIsEditing(true);

        // Update immediately if the input can be parsed as an integer
        const parsed = parseInt(details.value, 10);
        if (!Number.isNaN(parsed)) {
          const nextValue = sanitizeToInteger(details.value);
          if (nextValue !== betAmount) {
            updateSingleBetAmount(betIndex, nextValue);
          }
        }
      },
      [betAmount, betIndex, sanitizeToInteger, updateSingleBetAmount],
    );

    const handleFocus = useSelectOnFocus();

    const handleBlur = useCallback((): void => {
      // Only commit if the input can be parsed as an integer
      const cleaned = tempValue.trim().replace(/[,_\s]/g, '');
      const parsed = parseInt(cleaned, 10);

      if (Number.isNaN(parsed)) {
        // Revert visual value to current store value without updating the store
        setIsEditing(false);
        setTempValue(betAmount.toString());
        return;
      }

      const nextValue = sanitizeToInteger(tempValue);
      // Only update store if value actually changed
      if (nextValue !== betAmount) {
        updateSingleBetAmount(betIndex, nextValue);
      }
      setTempValue(nextValue.toString());
      setIsEditing(false);
    }, [betAmount, betIndex, sanitizeToInteger, tempValue, updateSingleBetAmount]);

    return (
      <NumberInputRoot
        size="xs"
        value={tempValue}
        onValueChange={handleChange}
        min={BET_AMOUNT_DEFAULT}
        max={BET_AMOUNT_MAX}
        step={1}
        clampValueOnBlur
        allowMouseWheel
        inputMode="numeric"
        width="90px"
        variant="subtle"
        {...rest}
      >
        <NumberInputField
          borderColor={invalid ? errorColor : 'border'}
          onBlur={handleBlur}
          onFocus={handleFocus}
          name={`bet-amount-input-${betIndex}`}
          data-testid={`bet-amount-input-${betIndex}`}
        />
        <NumberInputControl />
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
