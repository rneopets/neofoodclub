import { useState, useEffect, useCallback } from 'react';

import { useRoundStore } from '../stores';

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
  const setCustomOdds = useRoundStore(state => state.setCustomOdds);
  const setCustomProbs = useRoundStore(state => state.setCustomProbs);

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
      const state = useRoundStore.getState();
      const customValues = type === 'odds' ? state.customOdds : state.customProbs;

      if (customValues) {
        // Create new custom values, replacing this specific value with original
        const newCustomValues = customValues.map((arena, aIdx) => {
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

        if (type === 'odds') {
          setCustomOdds(newCustomValues);
        } else {
          setCustomProbs(newCustomValues);
        }
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
    const state = useRoundStore.getState();

    // Get the base values to use as starting point
    const allUsedValues =
      type === 'odds' ? state.roundData?.currentOdds : state.calculations.usedProbabilities;

    const currentCustomValues =
      (type === 'odds' ? state.customOdds : state.customProbs) || allUsedValues;

    if (currentCustomValues) {
      // Create a copy with the new value
      const newCustomValues = structuredClone(currentCustomValues);
      if (!newCustomValues[arenaIndex]) {
        newCustomValues[arenaIndex] = [];
      }
      newCustomValues[arenaIndex]![pirateIndex] = finalValue;

      if (type === 'odds') {
        setCustomOdds(newCustomValues);
      } else {
        setCustomProbs(newCustomValues);
      }
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
    setCustomOdds,
    setCustomProbs,
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
