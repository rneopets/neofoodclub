import { Input } from '@chakra-ui/react';
import React, { useState, useEffect, useCallback, FocusEvent, ChangeEvent } from 'react';

import { useOptimizedBetAmount, useUpdateSingleBetAmount } from '../stores';

interface BetAmountInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur'> {
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

    const sanitizeToInteger = useCallback((raw: string): number => {
      const trimmed = raw.trim();
      const MIN = -1000;
      const MAX = 500_000;
      if (trimmed === '') {
        return MIN;
      }
      // Remove common formatting characters (commas, spaces, underscores)
      const cleaned = trimmed.replace(/[,_\s]/g, '');
      const parsed = parseInt(cleaned, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return MIN;
      }
      // Clamp to allowed range
      return Math.min(Math.max(parsed, MIN), MAX);
    }, []);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
      setTempValue(e.target.value);
      setIsEditing(true);
    }, []);

    const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>): void => {
      e.target.select();
    }, []);

    const handleBlur = useCallback((): void => {
      const nextValue = sanitizeToInteger(tempValue);
      // Only update store if value actually changed
      if (nextValue !== betAmount) {
        updateSingleBetAmount(betIndex, nextValue);
      }
      setTempValue(nextValue.toString());
      setIsEditing(false);
    }, [betAmount, betIndex, sanitizeToInteger, tempValue, updateSingleBetAmount]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
          return;
        }
        e.preventDefault();
        const MIN = -1000;
        const MAX = 500_000;
        const cleaned = tempValue.trim().replace(/[,_\s]/g, '');
        const parsed = parseInt(cleaned, 10);
        const current = Number.isNaN(parsed) ? betAmount : parsed;
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        const next = Math.min(Math.max(current + delta, MIN), MAX);
        setTempValue(next.toString());
        updateSingleBetAmount(betIndex, next);
        setIsEditing(false);
      },
      [betAmount, betIndex, tempValue, updateSingleBetAmount],
    );

    return (
      <Input
        size="xs"
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        width="90px"
        aria-invalid={invalid ? true : undefined}
        name={`bet-amount-input-${betIndex}`}
        data-testid={`bet-amount-input-${betIndex}`}
        inputMode="numeric"
        // {...errorStyles}
        {...rest}
      />
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
