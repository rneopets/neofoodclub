import { useState, useEffect, useCallback } from 'react';

import { useRoundDataStore, useCalculationsStore } from '../stores';
import { memoizedCalculations } from '../stores/calculationsStore';

type CustomValueType = 'odds' | 'probs';

interface UseCustomValueInputProps {
  arenaIndex: number;
  pirateIndex: number;
  type: CustomValueType;
  customValue: number | undefined;
  originalValue: number;
  isPercent?: boolean;
}

export function useCustomValueInput({
  arenaIndex,
  pirateIndex,
  type,
  customValue,
  originalValue,
  isPercent = false,
}: UseCustomValueInputProps): {
  inputValue: string;
  handleChange: (valueAsString: string) => void;
  handleBlur: () => void;
  handleFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
} {
  const setRoundState = useRoundDataStore(state => state.setRoundState);

  // Convert values for display (probabilities need to be converted to percentages)
  const displayValue = isPercent
    ? (customValue ?? originalValue) * 100
    : (customValue ?? originalValue);

  // Local state for the input
  const [inputValue, setInputValue] = useState(displayValue.toString());

  // Effect to sync local state when the canonical value changes
  useEffect(() => {
    setInputValue(displayValue.toString());
  }, [displayValue]);

  // Handle input change
  const handleChange = useCallback((valueAsString: string): void => {
    setInputValue(valueAsString);
  }, []);

  // Handle blur event
  const handleBlur = useCallback(() => {
    const trimmedValue = inputValue.trim();

    // If input is empty, remove only this specific custom value
    if (trimmedValue === '') {
      const currentState = useRoundDataStore.getState().roundState;
      const customKey = type === 'odds' ? 'customOdds' : 'customProbs';
      const currentCustomValues = currentState[customKey];

      if (currentCustomValues) {
        // Create new custom values, replacing this specific value with original
        const newCustomValues = currentCustomValues.map((arena, aIdx) => {
          if (aIdx !== arenaIndex) {
            return arena;
          }
          // For this arena, copy all values except the one we're clearing
          return arena.map((value, pIdx) => {
            if (pIdx === pirateIndex) {
              // Use the original value for this pirate
              return originalValue;
            }
            return value;
          });
        });

        // Clear cache and force recalculation (same as when setting new values)
        const cacheKey = `${arenaIndex}_${pirateIndex}`;
        memoizedCalculations.clearCache(cacheKey);

        const calculationsStore = useCalculationsStore.getState();
        calculationsStore.lastCalculationKey = '';

        setRoundState({ [customKey]: newCustomValues });

        // Force recalculation
        setTimeout(() => {
          useCalculationsStore.getState().forceRecalculate();
        }, 0);
      }

      setInputValue((isPercent ? originalValue * 100 : originalValue).toString());
      return;
    }

    // Parse the input value and enforce precision
    let isInvalid = false;
    let finalValue = 0;
    let roundedDisplayValue = 0; // used to update the input display immediately

    if (isPercent) {
      const parsed = parseFloat(trimmedValue);
      if (isNaN(parsed)) {
        isInvalid = true;
      } else {
        // Round to 5 decimal places for display (percent input)
        const roundedPercent = Math.round(parsed * 1e5) / 1e5;
        roundedDisplayValue = roundedPercent;
        // Store as fraction (divide by 100)
        finalValue = roundedPercent / 100;
      }
    } else {
      const parsed = parseInt(trimmedValue, 10);
      if (isNaN(parsed)) {
        isInvalid = true;
      } else {
        roundedDisplayValue = parsed;
        finalValue = parsed;
      }
    }

    // If the value is invalid or unchanged, revert to display value
    if (isInvalid || finalValue === (customValue ?? originalValue)) {
      setInputValue(displayValue.toString());
      return;
    }

    // Get current state and update custom values
    const currentState = useRoundDataStore.getState().roundState;
    const customKey = type === 'odds' ? 'customOdds' : 'customProbs';

    // Get the base values to use as starting point
    const allUsedValues =
      type === 'odds'
        ? currentState.roundData?.currentOdds
        : useCalculationsStore.getState().calculations.usedProbabilities;

    const currentCustomValues = currentState[customKey] || allUsedValues;

    if (currentCustomValues) {
      // Track this specific value change
      const valueKey = `${type}_${arenaIndex}_${pirateIndex}`;
      memoizedCalculations.trackCustomValue(valueKey, finalValue);

      // Create a copy with the new value
      const newCustomValues = structuredClone(currentCustomValues);
      if (!newCustomValues[arenaIndex]) {
        newCustomValues[arenaIndex] = [];
      }
      newCustomValues[arenaIndex]![pirateIndex] = finalValue;

      // Clear cache and force recalculation
      const cacheKey = `${arenaIndex}_${pirateIndex}`;
      memoizedCalculations.clearCache(cacheKey);

      const calculationsStore = useCalculationsStore.getState();
      calculationsStore.lastCalculationKey = '';

      setRoundState({ [customKey]: newCustomValues });

      // Force recalculation
      setTimeout(() => {
        useCalculationsStore.getState().forceRecalculate();
      }, 0);
    }
    setInputValue((isPercent ? roundedDisplayValue : finalValue).toString());
  }, [
    inputValue,
    arenaIndex,
    pirateIndex,
    type,
    customValue,
    originalValue,
    isPercent,
    displayValue,
    setRoundState,
  ]);

  // Handle focus event
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>): void => {
    e.target.select();
  }, []);

  return {
    inputValue,
    handleChange,
    handleBlur,
    handleFocus,
  };
}
